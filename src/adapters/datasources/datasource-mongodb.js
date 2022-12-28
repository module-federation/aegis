'use strict'

const CircuitBreaker = require('../../domain/circuit-breaker').default
const DataSource = require('../../domain/datasource').default

const HIGHWATERMARK = 50

const mongodb = require('mongodb')
const { MongoClient } = mongodb
const { Transform, Writable } = require('stream')
const qpm = require('query-params-mongo')
const processQuery = qpm()

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const configRoot = require('../../config').hostConfig
const dsOptions = configRoot.adapters.datasources.DataSourceMongoDb.options || {
  runOffline: true,
  numConns: 2
}
const cacheSize = configRoot.adapters.cacheSize || 3000
let connPool

/**
 * @type {Map<string,MongoClient>}
 */
const connections = []

const mongoOpts = {
  //useNewUrlParser: true,
  //useUnifiedTopology: true
}

/**
 * MongoDB adapter extends in-memory
 * The cache is always updated first, which allows the system to run
 * even when the database is offline.
 */
export class DataSourceMongoDb extends DataSource {
  constructor (map, name, namespace, options = {}) {
    super(map, name, namespace, options)
    this.cacheSize = cacheSize
    this.mongoOpts = mongoOpts
    this.runOffline = dsOptions.runOffline
    this.url = url
  }

  /**
   *
   * @returns {Promise<import('mongodb').Db>}
   */
  async connectionPool () {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db)
      MongoClient.connect(
        this.url,
        {
          ...this.mongoOpts,
          poolSize: dsOptions.numConns || 2,
          connectTimeoutMS: 500
        },
        (err, db) => {
          if (err) return reject(err)
          this.db = db(this.namespace)
          resolve(this.db)
        }
      )
    })
  }

  connect (client) {
    return async function () {
      let timeout = false
      const timerId = setTimeout(() => {
        timeout = true
      }, 500)
      await client.connect()
      clearTimeout(timerId)
      if (timeout) throw new Error('mongo conn timeout')
    }
  }

  async connection () {
    try {
      while (connections.length < (dsOptions.numConns || 1)) {
        const client = new MongoClient(this.url, {
          ...this.mongoOpts,
          connectTimeoutMS: 500
        })
        const thresholds = {
          default: {
            errorRate: 1,
            callVolume: 1,
            intervalMs: 10000,
            testDelay: 300000,
            fallbackFn: () => console.log('circuit open')
          }
        }
        const breaker = CircuitBreaker(
          'mongodb.connect',
          this.connect(client),
          thresholds
        )
        await breaker.invoke()
        connections.push(client)
        client.on('connectionClosed', () =>
          connections.splice(connections.indexOf(client), 1)
        )
      }
      const client = connections.shift()
      connections.push(client)
      return client
    } catch (error) {
      console.error({ fn: this.connection.name, error })
    }
  }

  async collection () {
    try {
      return (await this.connection()).db(this.namespace).collection(this.name)
      // return (await this.connectionPool()).collection(this.name)
    } catch {}
  }

  async find (id) {
    try {
      return (await this.collection()).findOne({ _id: id })
    } catch (error) {
      console.error({ fn: this.find.name, error })
    }
  }

  /**
   * Save to the cache first, then the db.
   * Wait for both functions to complete.
   * Optionally keep running even if the
   * db is offline.
   *
   * @override
   * @param {*} id
   * @param {*} data
   */
  async save (id, data) {
    try {
      const col = await this.collection()
      col.replaceOne({ _id: id }, { ...data, _id: id }, { upsert: true })
    } catch (error) {
      // default is
      if (!this.runOffline) {
        throw new Error('db trans failed,', error)
      }
      // run while db is down - cache will be ahead
      console.error('db trans failed, sync it later', error)
    }
  }

  /**
   * Provides streaming upsert to db. Buffers and writes `highWaterMark`
   * number of records to db each time.
   *
   * @param {*} filter
   * @param {number} highWaterMark num of docs per batch write
   * @returns
   */
  createWriteStream (filter = {}, highWaterMark = HIGHWATERMARK) {
    try {
      let objects = []
      const ctx = this

      async function upsert () {
        const operations = objects.map(obj => {
          return {
            replaceOne: {
              filter: { ...filter, _id: obj.id },
              replacement: { ...obj, _id: obj.id },
              upsert: true
            }
          }
        })

        if (operations.length > 0) {
          try {
            const col = await ctx.collection()
            const result = await col.bulkWrite(operations)
            console.log(result.getRawResponse())
            objects = []
          } catch (error) {
            console.error({ fn: upsert.name, error })
          }
        }
      }

      const writable = new Writable({
        objectMode: true,

        async write (chunk, _encoding, next) {
          objects.push(chunk)
          // if true time to flush buffer and write to db
          if (objects.length >= highWaterMark) await upsert()
          next()
        },

        end (chunk, _, done) {
          objects.push(chunk)
          done()
        }
      })

      writable.on('finish', async () => await upsert())

      return writable
    } catch (error) {}
  }

  /**
   *
   * @param {Object} filter Supposed to be a valid Mongo Filter
   * @param {Object} sort a valid Mongo sort object
   * @param {Number} limit a valid Mongo limit
   * @param {Object} aggregate a valid Mongo aggregate object
   *
   * @returns {Promise<import('mongodb').AbstractCursor>}
   */
  async mongoFind ({ filter, sort, limit, aggregate, skip } = {}) {
    console.log({ fn: this.mongoFind.name, filter })
    let cursor = (await this.collection()).find(filter)
    if (sort) cursor = cursor.sort(sort)
    if (aggregate) cursor = cursor.aggregate(aggregate)
    if (skip) cursor = cursor.skip(skip)
    if (limit) cursor = cursor.limit(limit)
    return cursor
  }

  processOptions (param) {
    const { options = {}, query = {} } = param
    return { ...options, ...processQuery(query) }
  }

  /**
   *
   * @override
   * @param {import('../../domain/datasource').listOptions} param
   */
  async list (param) {
    try {
      const options = this.processOptions(param)
      console.log({ options })

      if (param.streamRequested) {
        return (await this.mongoFind(options)).stream()
      }

      return (await this.mongoFind(options)).toArray()
    } catch (error) {
      console.error({ fn: this.list.name, error })
    }
  }

  /**
   *
   * @override
   */
  async count () {
    return {
      total: await this.countDb(),
      cached: this.getCacheSize(),
      bytes: this.getCacheSizeBytes()
    }
  }

  /**
   * @override
   * @returns
   */
  async countDb () {
    return (await this.collection()).countDocuments()
  }

  /**
   * Delete from db, then cache.
   * If db fails, keep it cached.
   *
   * @override
   * @param {*} id
   */
  async delete (id) {
    try {
      await (await this.collection()).deleteOne({ _id: id })
    } catch (error) {
      console.error(error)
    }
  }
}

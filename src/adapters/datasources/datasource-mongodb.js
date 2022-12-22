'use strict'

import { MongoClient } from 'mongodb'
import { Transform, Writable } from 'stream'
import qpm from 'query-params-mongo'
import { CircuitBreaker } from '../../services'
import { hostConfig as configRoot } from '../../config'
import DataSource from '../../domain/datasource'

const HIGHWATERMARK = 50

const processQuery = qpm({
  autoDetect: [{ valuePattern: /^null$/i, dataType: 'nullstring' }],
  converters: {
    nullstring: val => {
      return { $type: 10 }
    }, // reference BSON datatypes https://www.mongodb.com/docs/manual/reference/bson-types/
  },
})

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017'

const dsOptions = configRoot.adapters.datasources.DataSourceMongoDb.options || {
  runOffline: false,
  numConns: 2,
}

const cacheSize = configRoot.adapters.cacheSize || 3000

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
  constructor(map, name, namespace, options = {}) {
    super(map, name, namespace, options)
    this.cacheSize = cacheSize
    this.mongoOpts = mongoOpts
    this.options = options
    this.runOffline = dsOptions.runOffline
    this.url = url
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

  async connectionPool () {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db)
      MongoClient.connect(
        this.url,
        {
          ...this.mongoOpts,
          poolSize: dsOptions.numConns || 2
        },
        (err, database) => {
          if (err) return reject(err)
          resolve((this.db = database.db(this.namespace)))
        }
      )
    })
  }

  async connection () {
    try {
      while (connections.length < (dsOptions.numConns || 1)) {
        const client = new MongoClient(this.url, this.mongoOpts)
        const thresholds = {
          default: {
            errorRate: 1,
            callVolume: 1,
            intervalMs: 10000,
            testDelay: 300000
            //fallbackFn: () => client.emit('connectionClosed')
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

      if (
        !this.options?.connOpts?.indexesHaveBeenRun &&
        this.options?.connOpts?.indexes
      ) {
        console.info(
          `running indexes for datasource ${this.name} with index values`,
          this.options.connOpts.indexes
        )
        await this.createIndexes(client)
        this.options.connOpts.indexesHaveBeenRun = true
      }

      return client
    } catch (error) {
      console.error({ fn: this.connection.name, error })
    }
  }

  async collection() {
    return (await this.connection()).db(this.namespace).collection(this.name)
  }

  async createIndexes(client) {
    const indexOperations = this.options.connOpts.indexes.map(index => {
      return {
        name: index.fields.join('_'),
        key: index.fields.reduce((a, v) => ({ ...a, [v]: 1 }), {}),
        ...index.options,
      }
    })

    return await client
      .db(this.namespace)
      .collection(this.name)
      .createIndexes(indexOperations)
  }

  async find(id) {
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
  async save(id, data) {
    try {
      await (
        await this.collection()
      ).replaceOne({ _id: id }, { ...data, _id: id }, { upsert: true })
    } catch (error) {
      // default is
      if (!this.runOffline) {
        throw new Error(`DB Transaction failed: ${error.message}`)
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
  createWriteStream(filter = {}, highWaterMark = HIGHWATERMARK) {
    try {
      let objects = []
      const ctx = this

      const upsert = async () => {
        const operations = objects.map(obj => {
          return {
            replaceOne: {
              filter: { ...filter, _id: obj.id },
              replacement: { ...obj, _id: obj.id },
              upsert: true,
            },
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

        async write(chunk, _encoding, next) {
          objects.push(chunk)
          // if true time to flush buffer and write to db
          if (objects.length >= highWaterMark) await upsert()
          next()
        },

        end(chunk, _, done) {
          objects.push(chunk)
          done()
        },
      })

      writable.on('finish', async () => await upsert())

      return writable
    } catch (error) {
      console.error({ fn: this.createWriteStream.name, error })
    }
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
    let cursor = aggregate
      ? (await this.collection()).aggregate(aggregate)
      : (await this.collection()).find(filter)

    if (sort) cursor = cursor.sort(sort)
    if (skip) cursor = cursor.skip(skip)
    if (limit) cursor = cursor.limit(limit)

    return cursor
  }

  /**
   *
   * @param {Object} options Options for function conditionals...
   * @param {Object} options.filter Supposed to be a valid Mongo Filter
   *
   * @returns
   */

  async mongoCount({ filter = {} } = {}) {
    return filter == {}
      ? await this.countDb()
      : (await this.collection()).count(filter)
  }

  /**
   * Pipes to writable and streams list. List can be filtered. Stream
   * is serialized by default. Stream can be modified by transform.
   *
   * @param  {{
   *  filter:*
   *  transform:Transform
   *  serialize:boolean
   * }} param0
   * @returns
   */
  streamList({ writable, serialize, transform, options }) {
    try {
      let pipeArgs = []

      const serializer = new Transform({
        writableObjectMode: true,

        // start of array
        construct(callback) {
          this.first = true
          this.push('[')
          callback()
        },

        // each chunk is a record
        transform(chunk, _encoding, next) {
          // comma-separate
          if (this.first) this.first = false
          else this.push(',')

          // serialize record
          this.push(JSON.stringify(chunk))
          next()
        },

        // end of array
        flush(callback) {
          this.push(']')
          callback()
        },
      })

      const paginate = new Transform({
        writableObjectMode: true,

        // start of array
        construct(callback) {
          this.push('{ ')
          callback()
        },

        // first chunk is the pagination data, rest is result
        transform(chunk, _encoding, next) {
          this.push(chunk)
          next()
        },

        // end of array
        flush(callback) {
          this.push('}')
          callback()
        },
      })

      return new Promise(async (resolve, reject) => {
        const readable = (await this.mongoFind(options)).stream()

        readable.on('error', reject)
        readable.on('end', resolve)

        // optionally transform db stream then pipe to output
        pipeArgs.push(readable)
        if (transform) pipeArgs.push(transform)
        if (serialize) pipeArgs.push(serializer)
        if (options.page) {
          const count = ~~(await this.mongoCount(options.filter))
          pipeArgs.push(paginate)
          paginate._transform(
            `"count":${count}, "total":${Math.ceil(
              count / options.limit
            )}, ${JSON.stringify(options).slice(1, -1)}, "data":`,
            'utf8',
            () => console.log('paginated query', options)
          )
        }
        pipeArgs.push(writable)

        // perform pipe operations
        pipeArgs.reduce((prevVal, currVal) => prevVal.pipe(currVal))
      })
    } catch (error) {
      console.error({
        fn: this.streamList.name,
        error,
      })
    }
  }

  processOptions({ options = {}, query = {} }) {
    return { ...processQuery(query), ...options } // options must overwite the query not otherwise
  }

  /**
   *
   * @override
   * @param {import('../../domain/datasource').listOptions} param
   */
  async list (param) {
    try {
      const options = this.processOptions(param)
      if (0 < ~~query.__page) {
        // qpm > processOptions weeds out __page - add it back properly as an integer
        options.page = ~~query.__page
        options.skip = (options.page - 1) * options.limit || 0
      }
      if (query.__aggregate) {
        // qpm > processOptions weeds out __aggregate - add it back properly as parsed json
        try {
          const aggregateQuery = JSON.parse(query.__aggregate)
          options.aggregate = aggregateQuery
        } catch (e) {
          console.error(e, 'invalid Aggregate')
        }
      }
      console.log({ options })

      if (writable && !query.__json)
        this.streamList({ writable, serialize, transform, options })
      else {
        const data = (await this.mongoFind(options)).toArray()
        const count = data?.length
        result = {
          ...options,
          data,
          count,
          total: Math.ceil(count / options.limit),
        }
      }

      return options?.page ? result : result?.data
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
      bytes: this.getCacheSizeBytes(),
    }
  }

  /**
   * @override
   * @returns
   */
  async countDb() {
    return (await this.collection()).countDocuments()
  }

  /**
   * Delete from db, then cache.
   * If db fails, keep it cached.
   *
   * @override
   * @param {*} id
   */
  async delete(id) {
    try {
      await (await this.collection()).deleteOne({ _id: id })
    } catch (error) {
      console.error(error)
    }
  }
}

'use strict'



import { MongoClient, ObjectId } from 'mongodb';
import { Transform, Writable } from 'stream';
import qpm from 'query-params-mongo';

import ModelFactory from '../../domain';
import EventBrokerFactory from '../../domain/event-broker';
import { DataSourceMemory } from './datasource-memory';

const HIGHWATERMARK = 50
const processQuery = qpm({
  autoDetect: [{ fieldPattern: /_id$/, dataType: 'objectId' }],
  converters: { objectId: ObjectId }
})

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const configRoot = require('../../config').hostConfig
const dsOptions = configRoot.adapters.datasources.DataSourceMongoDb.options || {
  runOffline: true,
  numConns: 2
}
const cacheSize = configRoot.adapters.cacheSize || 3000

/**
 * @type {Map<string,MongoClient>}
 */
const connections = []

const mongoOpts = {
  //useNewUrlParser: true,
  useUnifiedTopology: true
}

// Event Broker for hydrating models 
const broker = EventBrokerFactory.getInstance();

/**
 * MongoDB adapter extends in-memory datasource to support caching.
 * The cache is always updated first, which allows the system to run
 * even when the database is offline.
 */
export class DataSourceMongoDb extends DataSourceMemory {
  constructor (map, name, namespace, options = {}) {
    super(map, name, namespace, options)
    this.cacheSize = cacheSize
    this.mongoOpts = mongoOpts
    this.className = this.constructor.name
    this.runOffline = dsOptions.runOffline
    this.url = url
    //console.log(this)
  }

  async connection () {
    try {
      while (connections.length < (dsOptions.numConns || 1)) {
        const client = new MongoClient(this.url, this.mongoOpts)
        await client.connect()
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
    return (await this.connection()).db(this.namespace).collection(this.name)
  }

  /**
   * @override
   * @param {{
   *  hydrate:function(Map<string,import("../../domain").Model>),
   *  seriali zer:import("../../lib/serializer").Serializer
   * }} options
   */
  load ({ hydrate, serializer }) {
    try {
      this.hydrate = hydrate
      this.serializer = serializer
      this.loadModels()
    } catch (error) {
      console.error(error)
    }
  }

  async loadModels () {
    try {
      const cursor = (await this.collection()).find().limit(this.cacheSize)
      cursor.forEach(model => super.saveSync(model.id, model))
    } catch (error) {
      console.error({ fn: this.loadModels.name, error })
    }
  }

  async findDb (id) {
    try {
      return (await this.collection()).findOne({ _id: id })
    } catch (error) {
      console.error({ fn: this.findDb.name, error })
    }
  }

  /**
   * Check the cache first.
   * @overrid
   * @param {*} id - `Model.id`
   */
  async find (id) {
    try {
      const cached = super.findSync(id)
      if (
        cached === null ||
        cached === undefined ||
        Object.keys(cached).length == 0
      ) {
        // cached can be empty object, save after finding in db
        const data = await this.findDb(id)
        if (data) super.saveSync(id, data)
        return data
      }
      return cached
    } catch (error) {
      console.error({ fn: this.find.name, error })
    }
  }

  serialize (data) {
    if (this.serializer) {
      return JSON.stringify(data, this.serializer.serialize)
    }
    return JSON.stringify(data)
  }

  async saveDb (id, data) {
    try {
      const clone = JSON.parse(this.serialize(data))
      await (await this.collection()).replaceOne(
        { _id: id },
        { ...clone, _id: id },
        { upsert: true }
      )
      return data
    } catch (error) {
      console.error({ fn: this.saveDb.name, error })
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
      super.saveSync(id, data)
      try {
        await this.saveDb(id, data)
      } catch (error) {
        // default is true
        if (!this.runOffline) {
          super.deleteSync(id)
          // after delete mem and db are sync'd
          console.error('db trans failed, rolled back')
          return
        }
        // run while db is down - cache will be ahead
        console.error('db trans failed, sync it later')
      }
      return data
    } catch (e) {
      console.error(e)
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
          } catch (error) {}
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
   * @param {Object} options Options to sort limit aggregate etc...
   * @param {Object} options.sort a valid Mongo sort object
   * @param {Number} options.limit a valid Mongo limit
   * @param {Object} options.aggregate a valid Mongo aggregate object
   *
   * @returns
   */

  async mongoFind ({ filter, sort, limit, aggregate, skip } = {}) {
    console.log('Aegis MongoDataAdapter: filter',{ filter })
    let cursor = (await this.collection()).find(filter)
    if (sort) cursor = cursor.sort(sort)
    if (aggregate) cursor = cursor.aggregate(aggregate)
    if (skip) cursor = cursor.skip(skip)
    if (limit) cursor = cursor.limit(limit)
    return cursor
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
  streamList ({ writable, serialize, transform, options }) {
    try {
      let first = true

      const serializer = new Transform({
        writableObjectMode: true,

        // start of array
        construct (callback) {
          this.push('[')
          callback()
        },

        // each chunk is a record
        transform (chunk, _encoding, callback) {
          // comma-separate
          if (first) first = false
          else this.push(',')

          // serialize record
          this.push(JSON.stringify(chunk))
          callback()
        },

        // end of array
        flush (callback) {
          this.push(']')
          callback()
        }
      })

      return new Promise(async (resolve, reject) => {
        const readable = (await this.mongoFind(options)).stream()

        readable.on('error', reject)
        readable.on('end', resolve)

        // optionally transform db stream then pipe to output
        if (transform && serialize)
          readable
            .pipe(transform)
            .pipe(serializer)
            .pipe(writable)
        else if (transform) readable.pipe(transform).pipe(writable)
        else if (serialize) readable.pipe(serializer).pipe(writable)
        else readable.pipe(writable)
      })
    } catch (error) {}
  }

  processOptions (param) {
    const { options = {}, query = {} } = param
    return { ...options, ...processQuery(query) }
  }

  /**
   * Returns the set of objects satisfying the `filter` if specified;
   * otherwise returns all objects. If a `writable`stream is provided and `cached`
   * is false, the list is streamed. Otherwise the list is returned in
   * an array. A custom transform can be specified to modify the streamed
   * results. Using {@link createWriteStream} updates can be streamed back
   * to the db. With streams, we can support queries of very large tables,
   * with minimal memory overhead on the node server.
   *
   * @override
   * @param {{key1:string, keyN:string}} filter - e.g. http query
   * @param {{
   *  writable: WritableStream,
   *  cached: boolean,
   *  serialize: boolean,
   *  transform: Transform
   * }} params
   *    - details
   *    - `serialize` seriailize input to writable
   *    - `cached` list cache only
   *    - `transform` transform stream before writing
   *    - `writable` writable stream for output
   */
  async list (param = {}) {
    const {
      writable = null,
      transform = null,
      serialize = false,
      query = {}
    } = param
    try {
      console.log("QUERY:::", query);
      console.log("TRANSFORM:::", transform);
      console.log("SERIALIZE:::", serialize);
      console.log("WRITEABLE:::", writable);



      if (query.__cached) return super.listSync(query)
      if (query.__count) return this.count()

      const options = this.processOptions(param)
      console.log({ options })

      if (writable) {
        return this.streamList({ writable, serialize, transform, options })
      }
      const results = [];
      const listResults = (await this.mongoFind(options));
      for await (const doc of listResults) {
        results.push(doc);
      }
      
      return results.map(r => ModelFactory.loadModel(broker,  this, r , this.name));
    } catch (error) {
      console.error({ fn: this.list.name, error })
    }
  }

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
    return await (await this.collection()).countDocuments()
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
      super.deleteSync(id)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * @override
   * @param {*} pkvalue primary key value
   * @returns
   */
  async manyToOne (filter) {
    return (await this.collection()).findOne(filter)
  }

  /**
   * @override
   * @param {*} fkname name of foreign key
   * @param {*} pkvalue value of primary key
   * @returns
   */
  async oneToMany (filter) {
    return (await this.collection()).find(filter).toArray()
  }

  /**
   *
   * @param {*} filter
   * @returns
   */
  async containsMany (filter) {
    return (await this.collection()).find(filter).toArray()
  }

  /**
   * Flush the cache to disk.
   * @override
   */
  flush () {
    try {
      this.dsMap.reduce((a, b) => a.then(() => this.saveDb(b.getId(), b)), {})
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Process terminating, flush cache, close connections.
   * @override
   */
  close () {
    this.flush()
  }
}

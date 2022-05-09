'use strict'

const MongoClient = require('mongodb').MongoClient
const DataSourceMemory = require('./datasource-memory').DataSourceMemory

const url = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const configRoot = require('../../config').hostConfig
const cacheSize = configRoot.adapters.cacheSize || 3000

/**
 * @type {Map<string,MongoClient>}
 */
const connections = new Map()

const options = {
  //useNewUrlParserd: true,
  useUnifiedTopology: true
}

/**
 * MongoDB adapter extends in-memory datasource to support caching.
 * The cache is always updated first, which allows the system to run
 * even when the database is offline.
 */
export class DataSourceMongoDb extends DataSourceMemory {
  constructor (map, factory, name) {
    super(map, factory, name)
    this.cacheSize = cacheSize
    this.options = options
    this.url = url
  }

  async connection () {
    try {
      if (!connections.has(this.url)) {
        const client = new MongoClient(this.url, this.options)
        await client.connect()
        connections.set(this.url, client)
      }
      const client = connections.get(this.url)
      client.on('connectionReady', () => console.log('mongo conn ready'))
      client.on('connectionClosed', () => connections.delete(this.url))
      return client
    } catch (error) {
      console.error({ fn: this.connection.name, error })
    }
  }

  async collection () {
    try {
      return (await this.connection()).db(this.name).collection(this.name)
    } catch (error) {
      console.error({ fn: this.collection.name, error })
    }
  }

  /**
   * @override
   * @param {{
   *  hydrate:function(Map<string,import("../../domain").Model>),
   *  serializer:import("../../lib/serializer").Serializer
   * }} options
   */
  load ({ hydrate, serializer }) {
    try {
      this.hydrate = hydrate
      this.serializer = serializer
      this.loadModels()
    } catch (error) {}
  }

  async loadModels () {
    try {
      const cursor = (await this.collection()).find().limit(this.cacheSize)
      cursor.forEach(model => super.saveSync(model.id, this.hydrate(model)))
    } catch (error) {
      console.error({ fn: this.loadModels.name, error })
    }
  }

  async findDb (id) {
    try {
      const model = await (await this.collection()).findOne({ _id: id })
      // add to the cache and return it
      const hydratedModel = this.hydrate(model)
      super.saveSync(id, hydratedModel)
      return hydratedModel
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
      if (!cached) {
        return this.findDb(id)
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
      return clone
    } catch (error) {
      console.error({ fn: this.saveDb.name, error })
    }
  }

  /**
   * Save to the cache first, then the db.
   * Wait for both functions to complete. We
   * keep running even if the db is offline.
   *
   * @override
   * @param {*} id
   * @param {*} data
   */
  async save (id, data) {
    try {
      // use synchronous save to memory
      super.saveSync(id, data)
      // don't await - we don't need a resp
      return this.saveDb(id, data)
    } catch (error) {
      console.error({ fn: this.save.name, error })
    }
  }

  /**
   * @override
   * @param {{key1:string, keyN:string}} filter - e.g. http query
   * @param {boolean} cached - use the cache if true, otherwise go to db.
   */
  async list (filter = null, cached = true) {
    try {
      if (cached) {
        return super.listSync(filter)
      }
      /** @todo use a stream */
      return (await this.collection()).find().toArray()
    } catch (error) {
      console.error({ fn: this.list.name, error })
    }
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
      await Promise.all([
        await (await this.collection()).deleteOne({ _id: id }),
        super.delete(id)
      ])
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * Flush the cache to disk.
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
    this.client.close()
  }
}

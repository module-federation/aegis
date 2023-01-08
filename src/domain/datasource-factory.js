'use strict'

import { Readable, Transform, Writable, Stream } from 'node:stream'
import { isMainThread } from 'worker_threads'
/** @typedef {import('.').Model} Model */

/**
 * @typedef {object} dsOpts
 * @property {boolean} memoryOnly - if true returns memory adapter and caches it
 * @property {boolean} ephemeral - if true returns memory adapter but doesn't cache it
 * @property {string} adapterName - name of adapter to use
 * @property {Array<function():typeof import('./datasource').default>} mixins
 */

import ModelFactory from '.'
import EventBrokerFactory from './event-broker'
import * as adapters from '../adapters/datasources'
import { dsClasses } from '../adapters/datasources'
import configRoot from '../config'
import DataSource from './datasource'
import compose from './util/compose'
import { withSharedMemory } from './shared-memory'

const debug = /\*|datasource/i.test(process.env.DEBUG)
const broker = EventBrokerFactory.getInstance()
const FACTORY = Symbol('factory')
const defaultAdapter = configRoot.hostConfig.adapters.defaultDatasource
const DefaultDataSource =
  adapters[defaultAdapter] || dsClasses['DataSourceMemory']

class DsError extends Error {
  constructor (error, code = null, fn = null) {
    super(error)
    this.code = code
    console.error({ fn, error, code })
  }
}

/**
 * Core extensions adds support for object caching, serialization, marshalling,
 * and shared memory to any class in the {@link DataSource} hierachy.
 */
const DsCoreExtensions = superclass =>
  class extends superclass {
    constructor (map, name, namespace, options) {
      super(map, name, namespace, options)
    }

    set factory (value) {
      this[FACTORY] = value
    }

    get factory () {
      return this[FACTORY]
    }

    /**
     * Override the super class, adding cache and serialization functions.
     * @override
     * @param {string} id
     * @param {Model} data
     */
    async save (id, data) {
      try {
        this.saveSync(id, data)
        await super.save(id, JSON.parse(JSON.stringify(data)))
      } catch (error) {
        throw new DsError(error, 500, this.save.name)
      }
    }

    /**
     * Retrieve the {@link Model} with the specified `id`.
     * Searches cache first. Hydrates result if in a worker thread.
     * @override
     * @param {string} id
     * @returns {Promise<Model>|undefined}
     */
    async find (id) {
      try {
        const cached = this.findSync(id)
        if (cached) return cached

        const model = await super.find(id)
        if (model) {
          // save to cache
          this.saveSync(id, model)

          return isMainThread
            ? model // dont unmarshal - main gets readonly copy
            : ModelFactory.loadModel(broker, this, model, this.name)
        }
      } catch (error) {
        throw new DsError(error, 500, this.find.name)
      }
    }

    /**
     * Unmarshal JSON object to {@link Model} instance.
     *
     * @returns {Transform}
     */
    hydrate () {
      const ctx = this

      return new Transform({
        objectMode: true,

        transform (chunk, encoding, next) {
          this.push(ModelFactory.loadModel(broker, ctx, chunk, ctx.name))
          next()
        }
      })
    }

    /**
     * Serialize an object stream.
     *
     * @returns {Transform}
     */
    serialize () {
      let first = true

      return new Transform({
        objectMode: true,

        // start of array
        construct (next) {
          this.push('[')
          next()
        },

        // each chunk is a record
        transform (chunk, encoding, next) {
          // comma-separate
          if (first) first = false
          else this.push(',')

          // serialize record
          this.push(JSON.stringify(chunk))
          next()
        },

        // end of array
        flush (done) {
          this.push(']')
          done()
        }
      })
    }

    /**
     * Stream results of query.
     *
     * @param {Model[]|Stream[]} list
     * @param {import('./datasource').listOptions} options
     */
    stream (list, options) {
      return new Promise((resolve, reject) => {
        options.writable.on('error', reject)
        options.writable.on('end', resolve)

        if (!isMainThread) list.push(this.hydrate())
        if (options.transform) list.concat(options.transform)
        if (options.serialize) list.push(this.serialize())
        list.push(options.writable)

        list.reduce((p, c) => p.pipe(c))
      })
    }

    /**
     * @returns {boolean}
     */
    streamResult (options) {
      return options?.writable && !options.aggregation ? true : false
    }

    /**
     * @returns {boolean}
     */
    isStream (list) {
      return list.some(i => i instanceof Readable)
    }

    unmarshal (model) {
      return ModelFactory.loadModel(broker, this, model, this.name)
    }

    /**
     * Returns the set of objects satisfying the filter if specified;
     * otherwise returns all objects. If a `writable` stream is provided and
     * `cached` is false, the list is streamed. Otherwise the list is returned
     * in an array. One or more custom transforms can be specified to modify the
     * streamed results. If `createWriteStream` is implemented, updates can
     * be streamed back to the storage provider. With streams, we can support queries
     * of very large tables, with minimal memory overhead on the node server.
     *
     * @override
     * @param {import('../../domain/datasource').listOptions} param
     */
    async list (options) {
      try {
        if (options?.query?.__count)
          return this.handleCount(options.query.__count)
        if (options?.query?.__cached) return this.listSync(options.query)
        if (options?.query?.__aggregate) options.aggregation = true
        else if (options) options.aggregation = false

        const opts = { ...options, streamResult: this.streamResult(options) }
        const list = await super.list(opts)

        if (this.isStream(list)) return this.stream(list, options)
        return isMainThread ? list : list.map(model => this.unmarshal(model))
      } catch (error) {
        throw new DsError(error, 500, this.list.name)
      }
    }

    /**
     * @override
     * @param {*} id
     * @returns
     */
    async delete (id) {
      try {
        await super.delete(id)
        // only if super succeeds
        this.deleteSync(id)
      } catch (error) {
        throw new DsError(error, 500, this.delete.name)
      }
    }

    /**
     * return total records in external storage,
     * total records cached, size of cache in bytes
     * @override
     * @returns {{
     *  total: number,
     *  cached: number,
     *  bytes: number
     * }}
     */
    async count () {
      return {
        total: await super.count(),
        cached: this.getCacheSize(),
        bytes: this.getCacheSizeBytes()
      }
    }
  }

const extendClass = DsClass => class extends DsCoreExtensions(DsClass) {}

/**
 * Manages each domain model's dedicated datasource.
 * @todo handle all state same way
 * @typedef {{
 *  getDataSource:function(string): import("./datasource").default,
 *  getSharedDataSource(string): import("./datasource").default,
 *  getRestrictedDataSource(string): import("./datasource").default,
 *  listDataSources:Map[]
 * }} DataSourceFactory
 * @type {DataSourceFactory}
 */
const DataSourceFactory = (() => {
  /**
   * Contains the datasource of every model
   * @type {Map<string, DataSource>}
   */
  let dataSources

  /**
   * @param {*} name
   * @returns
   */
  function hasDataSource (name) {
    return dataSources.has(name)
  }

  function listDataSources () {
    return [...dataSources.keys()]
  }

  /**
   * @typedef dsOpts
   * @property {boolean} memoryOnly don't persist to storage
   * @property {boolean} cachedWrite allow cached ds to write to storage
   * @property {boolean} ephemeral temporary datastore - used just once
   * @property {string} adapterName specify the adapter to use
   * @property {Map<string,any>|import('sharedmap').SharedMap} dsMap
   * data source location and structure for private or shared memory
   * @property {function(typeof DataSource):typeof DataSource[]} mixins
   */

  /**
   * Create the class based on the options passed in,
   * customizations defined in the ModelSpec, or, if no
   * configuration is provided, use the default adapter
   * for the host instance.
   *
   * @param {import('.').ModelSpecification} spec
   * @param {dsOpts} options
   * @returns {typeof DataSource}
   */
  function createDataSourceClass (spec, options) {
    const { memoryOnly, ephemeral, adapterName } = options

    if (memoryOnly || ephemeral) return dsClasses['DataSourceMemory']
    if (adapterName) return adapters[adapterName] || DefaultDataSource

    if (spec?.datasource?.factory) {
      const url = spec.datasource.url
      const cacheSize = spec.datasource.cacheSize
      const adapterFactory = spec.datasource.factory
      const BaseClass = dsClasses[spec.datasource.baseClass] || DataSource
      return adapterFactory(url, cacheSize, BaseClass)
    }

    return DefaultDataSource
  }

  /**
   * Apply core compositional mixins and any extensions specifed in
   * {@link options}. Compostion allows us to observe the open/closed
   * principle and add new feature/functions arbitrarily to any
   * datasource class in the hierarchy without having to modify it.
   *
   * @param {typeof DataSource} DsClass
   * @param {dsOpts} options
   * @returns {typeof DataSource}
   */
  function extendDataSourceClass (DsClass, options = {}) {
    const mixins = [extendClass].concat(options.mixins || [])
    return compose(...mixins)(DsClass)
  }

  /**
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns {DataSource}
   */
  function createDataSource (name, namespace, options) {
    const spec = ModelFactory.getModelSpec(name)
    const dsMap = options.dsMap || new Map()

    const DsClass = createDataSourceClass(spec, options)
    const DsExtendedClass = extendDataSourceClass(DsClass, options)

    if (spec?.datasource) {
      options = { ...options, connOpts: { ...spec.datasource } }
    }

    const newDs = new DsExtendedClass(dsMap, name, namespace, options)
    newDs.factory = this // setter to avoid exposing in ctor
    if (!options.ephemeral) dataSources.set(name, newDs)

    debug && console.debug({ newDs })
    return newDs
  }

  /**
   * Get the datasource for each model.
   *
   * @param {string} name - model name
   * @param {dsOpts} options
   * @returns {import('./datasource').default}
   */
  function getDataSource (name, namespace = null, options = {}) {
    if (!dataSources) dataSources = new Map()
    if (!namespace) return dataSources.get(name)
    if (dataSources.has(name)) return dataSources.get(name)
    return createDataSource(name, namespace, options)
  }

  /**
   * Create a datasource based on {@link SharedArrayBuffer} that will live in
   * shared memory to be accessed in parallel by multiple coordinating threads.
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns
   */
  function getSharedDataSource (name, namespace = null, options = {}) {
    if (!dataSources) dataSources = new Map()
    if (!namespace) return dataSources.get(name)
    if (dataSources.has(name)) return dataSources.get(name)
    return withSharedMemory(createDataSource, this, name, namespace, options)
  }

  /**
   * Return a {@link Proxy} of the ds that traps calls to any functions
   * that could have security or privacy implications if accessed by
   * hosted code.
   *
   * @param {string} name
   * @returns {ProxyHandler<DataSource>}
   */
  function getRestrictedDataSource (name, namespace, options) {
    return new Proxy(getDataSource(name, namespace, options), {
      get (target, key) {
        if (key === 'factory') {
          throw new DsError('Unauthorized', 403)
        }
      },
      ownKeys (target) {
        return []
      }
    })
  }

  function close () {
    dataSources.forEach(ds => ds.close())
  }

  return Object.freeze({
    /**
     * Get `DataSource` singleton
     * @method
     * @returns {import('./datasource').default} DataSource singleton
     */
    getDataSource,
    getSharedDataSource,
    getRestrictedDataSource,
    hasDataSource,
    listDataSources,
    close
  })
})()

/** @type {DataSourceFactory}*/
export default DataSourceFactory

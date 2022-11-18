'use strict'

import { Transform } from 'stream'
import { isMainThread } from 'worker_threads'
/** @typedef {import('.').Model} Model */

/**
 * @typedef {object} dsOpts
 * @property {boolean} memoryOnly - if true returns memory adapter and caches it
 * @property {boolean} ephemeral - if true returns memory adapter but doesn't cache it
 * @property {string} adapterName - name of adapter to use
 */

import ModelFactory from '.'
import EventBrokerFactory from './event-broker'
import * as adapters from '../adapters/datasources'
import { dsClasses } from '../adapters/datasources'
import configRoot from '../config'
import DataSource from './datasource'
import { withSharedMemory } from './shared-memory'
import compose from './util/compose'

const debug = /\*|datasource/i.test(process.env.DEBUG)
const broker = EventBrokerFactory.getInstance()
const FACTORY = Symbol('factory')
const defaultAdapter = configRoot.hostConfig.adapters.defaultDatasource
const DefaultDataSource =
  adapters[defaultAdapter] || dsClasses['DataSourceMemory']

const DsCoreExtensions = superclass =>
  class extends superclass {
    set factory (value) {
      this[FACTORY] = value
    }

    get factory () {
      return this[FACTORY]
    }

    serialize (data, options) {
      if (options?.serializers) return options.serializers['serialize'](data)
      return JSON.stringify(data)
    }

    async save (id, data) {
      this.saveSync(id, data)
      const clone = JSON.parse(this.serialize(data))
      super.save(id, clone)
    }

    async find (id) {
      const cached = this.findSync(id)
      if (cached) return cached

      const model = await super.find(id)

      if (model) {
        this.saveSync(id, model)
        return isMainThread
          ? model
          : ModelFactory.loadModel(broker, this, model, this.name)
      }
    }

    transform () {
      const ctx = this

      return new Transform({
        objectMode: true,

        transform (chunk, _encoding, callback) {
          this.push(ModelFactory.loadModel(broker, ctx, chunk, ctx.name))
          callback()
        }
      })
    }

    async list (options) {
      if (options?.writable)
        return isMainThread
          ? super.list(options)
          : super.list({ ...options, transfrom: this.transform() })

      const arr = await super.list(options)

      if (Array.isArray(arr))
        return isMainThread
          ? arr
          : arr.map(model =>
              ModelFactory.loadModel(broker, this, model, this.name)
            )
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

    if (spec?.datasource) {
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

    const newDs = new DsExtendedClass(dsMap, name, namespace, options)
    newDs.factory = this // setter to avoid exposing in ctor

    if (!options.ephemeral) dataSources.set(name, newDs)

    //debug &&
    console.debug({ newDs })
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
          throw new Error('unauthorized')
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

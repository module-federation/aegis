'use strict'

/** @typedef {import('.').Model} Model */

/**
 * @typedef {object} dsOpts
 * @property {boolean} memoryOnly - if true returns memory adapter and caches it
 * @property {boolean} ephemeral - if true returns memory adapter but doesn't cache it
 * @property {string} adapterName - name of adapter to use
 */

import ModelFactory from '.'
import * as adapters from '../adapters/datasources'
import { dsClasses } from '../adapters/datasources'
import sysconf from '../config'
import DataSource from './datasource'
import { withSharedMemory } from './shared-memory'

const defaultAdapter = sysconf.hostConfig.adapters.defaultDatasource
const DefaultDataSource = adapters[defaultAdapter]

if (!DefaultDataSource) throw new Error('no default datasource')

/**
 * Manages each domain model's dedicated datasource.
 * @todo handle all state same way
 * @typedef {{
 *  getDataSource:function(string):import("./datasource").default,
 *  listDataSources:Map[]
 * }} DataSourceFactory
 * @type {DataSourceFactory}
 */
const DataSourceFactory = (() => {
  // References all DSes
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
   * @property {function(typeof DataSource):typeof DataSource} mixin
   */

  /**
   *
   * @param {import('.').ModelSpecification} spec
   * @param {dsOpts} options
   * @returns {typeof DataSource}
   */
  function createDataSourceClass (spec, options) {
    const { memoryOnly, ephemeral, adapterName } = options

    if (memoryOnly || ephemeral) {
      return dsClasses['DataSourceMemory']
    }

    if (adapterName) return adapters[adapterName] || DefaultDataSource

    if (spec?.datasource) {
      const url = spec.datasource.url
      const cacheSize = spec.datasource.cacheSize
      const adapterFactory = spec.datasource.factory
      const BaseClass = dsClasses[spec.datasource.baseClass]
      return adapterFactory(url, cacheSize, BaseClass)
    }

    return DefaultDataSource
  }

  /**
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns {DataSource}
   */
  function createDataSource (name, options = {}) {
    const spec = ModelFactory.getModelSpec(name)
    const dsMap = options.dsMap || new Map()
    const DsClass = createDataSourceClass(spec, options)
    const MixinClass = options.mixin ? options.mixin(DsClass) : DsClass
    const newDs = new MixinClass(dsMap, this, name)
    if (!options.ephemeral) dataSources.set(name, newDs)
    return newDs
  }

  /**
   * Get the datasource for each model.
   * @param {string} name - model name
   * @param {dsOpts} options
   * @returns {import('./datasource').default}
   */
  function getDataSource (name, options = {}) {
    const upperName = name.toUpperCase()

    if (!dataSources) {
      dataSources = new Map()
    }

    if (dataSources.has(upperName)) {
      return dataSources.get(upperName)
    }

    return createDataSource(upperName, options)
  }

  /**
   *
   * @param {string} name
   * @param {dsOpts} [options]
   * @returns
   */
  function getSharedDataSource (name, options = {}) {
    const upperName = name.toUpperCase()

    if (!dataSources) {
      dataSources = new Map()
    }

    if (dataSources.has(upperName)) {
      return dataSources.get(upperName)
    }

    return withSharedMemory(createDataSource, this, upperName, options)
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
    hasDataSource,
    listDataSources,
    close
  })
})()

export default DataSourceFactory

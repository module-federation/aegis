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
import dsconfig from '../adapters/datasources'
import sysconf from '../config'
import { withSharedMem } from './shared-memory'

const defaultAdapter = sysconf.hostConfig.adapters.defaultDatasource
const DefaultDataSource = adapters[defaultAdapter]

if (!DefaultDataSource) throw new Error('no default datasource')
/**
 * Creates or returns the dedicated datasource for the domain model.
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
   * @method
   * @param {*} name
   * @returns
   */
  function hasDataSource (name) {
    return dataSources.has(name)
  }

  function listDataSources () {
    return [...dataSources]
  }

  function getDataSourceClass (spec, options) {
    const { memoryOnly, cachedWrite, ephemeral, adapterName } = options

    if ((memoryOnly && !cachedWrite) || ephemeral) {
      return dsconfig.getBaseClass(dsconfig.MEMORYADAPTER)
    }

    if (adapterName) return adapters[adapterName] || DefaultDataSource

    if (spec && spec.datasource) {
      const url = spec.datasource.url
      const cacheSize = spec.datasource.cacheSize
      const adapterFactory = spec.datasource.factory
      const BaseClass = dsconfig.getBaseClass(spec.datasource.baseClass)
      return adapterFactory(url, cacheSize, BaseClass)
    }

    return DefaultDataSource
  }

  /**
   * Get the datasource for each model.
   * @param {string} name - model name
   * @param {dsOpts} options - memory only, ephemeral, adapter ame
   * @returns {import('./datasource').default}
   */
  function getDataSource (name, options) {
    if (!dataSources) {
      dataSources = new Map()
    }

    if (dataSources.has(name)) {
      return dataSources.get(name)
    }
    const spec = ModelFactory.getModelSpec(name)
    const dsMap = options.dsMap || new Map()
    const DsClass = getDataSourceClass(spec, options)
    const MixinClass = options.mixin ? options.mixin(DsClass) : DsClass
    const newDs = new MixinClass(dsMap, this, name)

    if (!options.ephemeral) dataSources.set(name, newDs)

    return newDs
  }

  function getSharedDataSource (name, options) {
    console.debug({ fn: getSharedDataSource.name, name, options })
    const a = withSharedMem(getDataSource.bind(this, name), options)
    console.debug({ a })
    return a
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

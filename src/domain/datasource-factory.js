'use strict'

/** @typedef {import('.').Model} Model */

import ModelFactory from '.'
import * as adapters from '../adapters/datasources'
import dbconfig from '../adapters/datasources'
import sysconf from '../config'

const defaultAdapter = sysconf.hostConfig.adapters.defaultDatasource
const DefaultDataSource = adapters[defaultAdapter]

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

  /**
   * Get datasource from model spec or return default for server.
   * @param {Map} ds - data structure
   * @param {DataSourceFactory} factory this factory
   * @param {string} name datasource name
   * @returns
   */
  function getSpecDataSource (ds, factory, name) {
    const spec = ModelFactory.getModelSpec(name)

    if (spec && spec.datasource) {
      const url = spec.datasource.url
      const cacheSize = spec.datasource.cacheSize
      const adapterFactory = spec.datasource.factory
      const BaseClass = dbconfig.getBaseClass(spec.datasource.baseClass)

      try {
        const DataSource = adapterFactory(url, cacheSize, BaseClass)
        return new DataSource(ds, factory, name)
      } catch (error) {
        console.error(error)
      }
    }
    // use default datasource
    return new DefaultDataSource(ds, factory, name)
  }

  /**
   * @typedef {object} dsOpts
   * @property {boolean} memoryOnly - if true returns memory adapter and caches it
   * @property {boolean} ephemeral - if true returns memory adapter but doesn't cache it
   * @property {string} adapterName - name of adapter to use
   */

  /**
   * Get the datasource for each model.
   * @param {string} name - model name
   * @param {dsOpts} options - memory only, ephemeral, adapter ame
   * @returns {import('./datasource').default}
   */
  function getDataSource (name, { memoryOnly, ephemeral, adapterName } = {}) {
    if (!dataSources) {
      dataSources = new Map()
    }

    if (dataSources.has(name)) {
      return dataSources.get(name)
    }

    if (memoryOnly || ephemeral) {
      const MemoryDs = dbconfig.getBaseClass(dbconfig.MEMORYADAPTER)
      const newDs = new MemoryDs(new Map(), this, name)
      if (!ephemeral) dataSources.set(name, newDs)
      return newDs
    }

    if (adapterName) {
      const adapter = adapters[adapterName]
      if (adapter) {
        const newDs = new adapter(new Map(), this, name)
        dataSources.set(name, newDs)
        return newDs
      }
      console.error('no such adapter', adapterName)
      return
    }

    const newDs = getSpecDataSource(new Map(), this, name)
    dataSources.set(name, newDs)
    return newDs
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
    hasDataSource,
    listDataSources,
    close
  })
})()

export default DataSourceFactory

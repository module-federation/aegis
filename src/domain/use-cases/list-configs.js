'use strict'

import ThreadPoolFactory from '../thread-pool'

/**
 * @param {{
 * models:import("../model").Model,
 * data:import("../datasource-factory").DataSourceFactory,
 * broker:import('../event-broker').EventBroker)
 * }} options
 */
export default function listConfigsFactory ({ models, data, broker } = {}) {
  return async function listConfigs (query) {
    if (query?.details === 'data') {
      return {
        main: data.listDataSources().map(
          ([k]) => data.getDataSource(k).listSync()
          //.filter(m => typeof m['getName'] !== 'function')
        ),
        threads: await ThreadPoolFactory.postMessage({
          name: 'showData',
          data: query.modelName || 'ORDER'
        })
      }
    } else if (query.details === 'threads') {
      return ThreadPoolFactory.status()
    } else if (query.details === 'events') {
      return broker.getEvents()
    } else {
      return models.getModelSpecs()
    }
  }
}

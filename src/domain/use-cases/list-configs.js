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
      return JSON.stringify(data.listDataSources().map(([, v]) => v))
    } else if (query.details === 'threads') {
      return ThreadPoolFactory.status()
    } else if (query.details === 'events') {
      return broker.getEvents()
    } else {
      return models.getModelSpecs()
    }
  }
}

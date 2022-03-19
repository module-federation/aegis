'use strict'

/**
 * @param {{
 *  models:import("../model").Model,
 *  data:import("../datasource-factory").DataSourceFactory
 *  broker:import('../event-broker').EventBroker
 *  threadpools:import('../thread-pool').default
 * }} injectedDependencies
 */
export default function listConfigsFactory ({
  models,
  data,
  broker,
  threadpools
} = {}) {
  return async function listConfigs (query) {
    if (query?.details === 'data') {
      if (query.modelName) {
        return threadpools.fireEvent({
          name: 'showData',
          data: query.modelName
        })
      }
      return data
        .listDataSources()
        .map(([k]) => data.getDataSource(k).listSync())
    } else if (query.details === 'threads') {
      return threadpools.status()
    } else if (query.details === 'events') {
      if (query.modelName) {
        return threadpools.fireEvent({
          name: 'showEvents',
          data: query.modelName
        })
      }
      return broker.getEvents()
    } else {
      return models.getModelSpecs()
    }
  }
}

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
        .map(([k, v]) => ({ dsname: k, records: [...v.dataSource].length }))
    } else if (query.details === 'threads') {
      return threadpools.status()
    } else if (query.details === 'events') {
      if (query.modelName) {
        return threadpools.fireEvent({
          name: 'showEvents',
          data: query.modelName
        })
      }
      return [...broker.getEvents()].map(([k, v]) => ({
        name: k,
        handlers: v.map(v => v.toString())
      }))
    } else {
      return models.getModelSpecs()
    }
  }
}

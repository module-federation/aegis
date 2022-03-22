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
    const configTypes = {
      data: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showData',
              data: query.modelName
            })
          : data.listDataSources().map(([k, v]) => ({
              dsname: k,
              records: [...v.dataSource].length
            })),

      events: () =>
        query.modelname
          ? threadpools.fireEvent({
              name: 'showEvents',
              data: query.modelName
            })
          : [...broker.getEvents()].map(([k, v]) => ({
              name: k,
              handlers: v.map(v => v.toString())
            })),

      models: () =>
        query?.modelName
          ? threadpools.fireEvent({
              name: 'showModels',
              data: query.modelName
            })
          : models.getModelSpecs(),

      threads: () => threadpools.status()
    }

    try {
      if (query?.details) return configTypes[query.details]()
    } catch (error) {
      console.error(error)
    }
    return configTypes.models()
  }
}

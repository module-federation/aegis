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
              records: v.map.size()
            })),

      events: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showEvents',
              data: query.modelName
            })
          : [...broker.getEvents()].map(([k, v]) => ({
              eventName: k,
              handlers: v.length
            })),

      models: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showModels',
              data: query.modelName
            })
          : models.getModelSpecs(),

      threads: () => threadpools.status(),

      relations: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showRelations',
              data: query.modelName
            })
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              relations: spec.relations ? Object.values(spec.relations) : []
            })),

      commands: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showCommands',
              data: query.modelName
            })
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              commands: spec.commands ? Object.values(spec.commands) : []
            })),

      ports: () =>
        query.modelName
          ? threadpools.fireEvent({
              name: 'showPorts',
              data: query.modelName
            })
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              ports: spec.ports ? Object.values(spec.ports) : []
            }))
    }

    if (query?.details && typeof configTypes[query.details] === 'function')
      return configTypes[query.details]()

    return configTypes.models()
  }
}

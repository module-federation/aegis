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
          ? threadpools.getThreadPool(query.modelName).run('showData')
          : data.listDataSources().map(k => ({
              dsname: k,
              records: data.getDataSource(k).totalRecords()
            })),
      events: () =>
        query.modelName
          ? threadpools.getThreadPool(query.modelName).run('showEvents')
          : [...broker.getEvents()].map(([k, v]) => ({
              eventName: k,
              handlers: v.length
            })),

      models: () =>
        query.modelName
          ? threadpools.getThreadPool(query.modelName).run('showModels')
          : models.getModelSpecs(),

      threads: () => threadpools.status(),

      relations: () =>
        query.modelName
          ? threadpools.getThreadPool(query.modelName).run('showRelations')
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              relations: spec.relations ? Object.values(spec.relations) : []
            })),

      commands: () =>
        query.modelName
          ? threadpools.getThreadPool(query.modelName).run('showCommands')
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              commands: spec.commands ? Object.values(spec.commands) : []
            })),

      ports: () =>
        query.modelName
          ? threadpools.getThreadPool(query.modelName).run('showPorts')
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

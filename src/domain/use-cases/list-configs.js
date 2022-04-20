'use strict'

import { isMainThread } from 'worker_threads'

/**
 * @param {{
 *  models:import("../model").Model,
 *  dsFact:import("../datasource-factory").DataSourceFactory
 *  broker:import('../event-broker').EventBroker
 *  threadpools:import('../thread-pool').default
 * }} injectedDependencies
 */
export default function listConfigsFactory ({
  models,
  dsFact,
  broker,
  threadpools
} = {}) {
  return async function listConfigs (query) {
    const modelName =
      typeof query.modelName === 'string' ? query.modelName.toUpperCase() : null

    const configTypes = {
      data: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : dsFact.listDataSources().map(k => ({
              dsname: k,
              records: dsFact.getDataSource(k).totalRecords()
            })),
            
      events: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : [...broker.getEvents()].map(([k, v]) => ({
              eventName: k,
              handlers: v.length
            })),

      models: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName
          ? models.getModelSpec(modelName)
          : models.getModelSpecs(),

      threads: () => (isMainThread ? threadpools.status() : null),

      relations: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName
          ? models.getModelSpec(modelName).relations
          : models.getModelSpecs().map(spec => ({
              relations: spec.relations ? Object.values(spec.relations) : {}
            })),

      commands: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName
          ? models.getModelSpec(modelName).commands
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              commands: spec.commands ? Object.values(spec.commands) : {}
            })),

      ports: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName
          ? models.getModelSpec(modelName).ports
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
              ports: spec.ports ? Object.values(spec.ports) : {}
            }))
    }

    if (query?.details && typeof configTypes[query.details] === 'function')
      return configTypes[query.details]()

    return configTypes.models()
  }
}

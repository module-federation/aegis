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
  broker,
  datasources,
  threadpools
} = {}) {
  return async function listConfigs (query) {
    const modelName =
      typeof query.modelName === 'string' ? query.modelName.toUpperCase() : null
    const poolName =
      typeof query.poolName === 'string' ? query.poolName.toUpperCase() : null

    const configTypes = {
      data: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName && poolName
          ? datasources.getSharedDataSource(poolName).listSync()
          : modelName
          ? datasources.getSharedDataSource(modelName).listSync()
          : datasources.listDataSources().map(k => ({
              dsname: k,
              objects: datasources.getSharedDataSource(k).countSync()
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
          ? models.getModelSpecs().filter(spec => !spec.internal)
          : models.getModelSpecs().filter(spec => !spec.internal),

      threads: () => (isMainThread ? threadpools.status() : null),

      relations: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName
          ? models.getModelSpec(modelName).relations
          : models.getModelSpecs().map(spec => ({
              modelName: spec.modelName,
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

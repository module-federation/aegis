'use strict'

import { SharedMap } from 'sharedmap'
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
    const poolName =
      typeof query.poolName === 'string' ? query.poolName.toUpperCase() : null

    const configTypes = {
      data: () =>
        modelName && isMainThread
          ? threadpools.getThreadPool(modelName).run(listConfigs.name, query)
          : modelName && poolName
          ? dsFact.getDataSource(poolName).listSync()
          : modelName
          ? dsFact.getDataSource(modelName).listSync()
          : dsFact.listDataSources().map(k => ({
              dsname: k,
              objects: dsFact.getDataSource(k).totalRecords()
            })),

      data_main: () =>
        dsFact.listDataSources().map(k => ({
          dsname: k,
          objects: dsFact.getDataSource(k).totalRecords()
        })),

      data_thread: () =>
        isMainThread
          ? threadpools
              .getThreadPool(modelName || 'newPool')
              .run(listConfigs.name, query)
          : dsFact.listDataSources().map(k => ({
              dsname: k,
              objects:
                typeof dsFact.getDataSource(k).dsMap === 'object'
                  ? dsFact.getDataSource(k).totalRecords()
                  : 0
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

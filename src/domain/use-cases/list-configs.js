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
  try {
    return async function listConfigs (query) {
      const modelName =
        typeof query.modelName === 'string' ? query.modelName.toUpperCase() : null
      const poolName =
        typeof query.poolName === 'string' ? query.poolName.toUpperCase() : null

      const configTypes = {
        data: async () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, query, modelName)
            : modelName && poolName
              ? await datasources.getSharedDataSource(poolName).list()
              : modelName
                ? await datasources.getSharedDataSource(modelName).list()
                : await Promise.all(
                  datasources.listDataSources().map(async k => ({
                    dsname: k,
                    objects: await datasources.getSharedDataSource(k).countDb(),
                    cached: await datasources.getSharedDataSource(k).getCacheSize(),
                    memory: await datasources
                      .getSharedDataSource(k)
                      .getCacheSizeBytes()
                  }))
                ),

        events: () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, query, modelName)
            : [...broker.getEvents()].map(([k, v]) => ({
              eventName: k,
              handlers: v.length
            })),

        models: () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, query, modelName)
            : modelName
              ? models.getModelSpecs().filter(spec => !spec.internal)
              : models.getModelSpecs().filter(spec => !spec.internal),

        threads: () => (isMainThread ? threadpools.status() : null),

        relations: () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, query, modelName)
            : modelName
              ? models.getModelSpec(modelName).relations
              : models.getModelSpecs().map(spec => ({
                modelName: spec.modelName,
                relations: spec.relations ? Object.values(spec.relations) : {}
              })),

        commands: () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, query, modelName)
            : modelName
              ? models.getModelSpec(modelName).commands
              : models.getModelSpecs().map(spec => ({
                modelName: spec.modelName,
                commands: spec.commands ? Object.values(spec.commands) : {}
              })),

        ports: () =>
          modelName && isMainThread
            ? threadpools.getThreadPool(modelName).runJob(listConfigs.name, quer, modelName)
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
  } catch (error) {
    console.error({ fn: listConfigsFactory.name, error })
    throw error
  }
}

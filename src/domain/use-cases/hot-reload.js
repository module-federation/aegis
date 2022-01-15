'use strict'

import * as fs from 'fs'
import path from 'path'
import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool.js'

/**
 * @typedef {Object} dependencies injected dependencies
 * @property {String} modelName - name of the domain model
 * @property {import('../model-factory').ModelFactory} models - model factory
 * @property {import('../datasource').default } repository - model datasource adapter
 * @property {import('../thread-pool.js').ThreadPool} threadpool
 * @property {import('../event-broker').EventBroker} broker - application events, propagated to domain
 * @property {...import('../index').eventHandler} handlers - {@link eventHandler} configured in the model spec.
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} addModel
 * @param {dependencies} param0
 * @returns {function():Promise<import('../domain').Model>}
 */
export default function makeHotReload ({ models, broker } = {}) {
  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.hotReload(), hotReload)

  function registerNewModel (remoteEntry) {
    fs.writeFileSync(
      path.resolve(process.cwd(), 'webpack', remoteEntry.modelFile),
      JSON.stringify(remoteEntry.modelEntries)
    )
    fs.writeFileSync(
      path.resolve(process.cwd(), 'webpack', 'remote-entries.js'),
      JSON.stringify(remoteEntry.mainEntries)
    )
  }

  async function hotReload ({ modelName, remoteEntry = null }) {
    if (isMainThread) {
      if (modelName) {
        if (modelName === '*') {
          await ThreadPoolFactory.clearAll()
          return { status: `reload complete for all thread pools` }
        }

        if (modelName) {
          await ThreadPoolFactory.clearByName(modelName)
          return {
            status: `reload complete for thread pool ${modelName}`,
            modelName
          }
        }

        if (remoteEntry) {
          registerNewModel(remoteEntry)
          return {
            status: 'thread pool and remote-entry created for new model',
            modelName
          }
        }

        const pools = ThreadPoolFactory.listPools().map(p => p.toLowerCase())
        const allModels = models
          .getModelSpecs()
          .map(spec => spec.modelName.toLowerCase())

        pools
          .filter(poolName => !allModels.includes(poolName))
          .forEach(async poolName => await ThreadPoolFactory.clear(poolName))
      }
      return { status: `no model specified ${modelName}` }
    }
  }

  return hotReload
}

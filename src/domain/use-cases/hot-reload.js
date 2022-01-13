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

  /**
   *
   * @param {import('../thread-pool.js').ThreadPool} pool
   */
  async function reloadPool (pool) {
    const total = pool.threadPoolSize()
    const fresh = []

    let i = 0
    while (i < total) {
      if (i > 100) break
      pool
        .availableThreads()
        .map(a => a.threadId)
        .filter(a => !fresh.includes(a))
        .forEach(a => {
          if (pool.removeThread(a)) {
            const thread = pool.addThread()
            fresh.push(thread.threadId)
            i++
          }
        })
    }
  }

  async function hotReload ({ modelName, remoteEntry = null }) {
    if (isMainThread) {
      if (modelName) {
        if (modelName === '*') {
          models.getModelSpecs().forEach(spec => reloadPool(spec.threadpool))
          return { status: `reload complete for all thread pools` }
        }

        const pool = models.getModelSpec(modelName).threadpool
        if (pool) {
          reloadPool(pool)
          return { status: `reload complete for ${modelName}`, modelName }
        }

        ThreadPoolFactory.getThreadPool(modelName)
        if (remoteEntry) registerNewModel(remoteEntry)
        return {
          status: 'thread pool and remote-entry created for new model',
          modelName
        }
      }
      return { status: `no ${modelName} specified` }
    }
  }

  return hotReload
}

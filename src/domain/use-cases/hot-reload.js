'use strict'

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

let inProgress = false

export default function makeHotReload ({ models, broker } = {}) {
  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.hotReload(), hotReload)

  /**
   *
   * @param {{
   *  modelName:string
   *  remoteEntry:import('../../../webpack/remote-entries-type')
   *  sendMsg: function(string)
   * }} param0
   * @returns
   */
  async function hotReload (modelName) {
    const model = modelName.toUpperCase()

    if (inProgress) {
      return { status: 'reload already in progress' }
    }
    inProgress = true

    return new Promise(async resolve => {
      try {
        if (model !== '*') {
          await ThreadPoolFactory.reload(model)

          return resolve({
            status: `threadpool up for ${model}`,
            modelName: model
          })
        } else {
          await ThreadPoolFactory.reloadAll()

          const pools = ThreadPoolFactory.listPools().map(pool =>
            pool.toUpperCase()
          )
          const allModels = models
            .getModelSpecs()
            .map(spec => spec.modelName.toUpperCase())

          pools
            .filter(poolName => !allModels.includes(poolName))
            .forEach(
              async poolName => await ThreadPoolFactory.dispose(poolName)
            )
          return resolve({
            status: `threadpools restarted for all models`,
            modelName: model
          })
        }
      } catch (error) {
        return resolve({ fn: hotReload.name, error })
      } finally {
        inProgress = false
      }
    })
  }

  return hotReload
}

'use strict'

import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool.js'

/**
 * @typedef {object} factoryParam
 * @property {Object} dependencies injected dependencies
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

/**
 *
 * @param {factoryParam} param0
 * @returns
 */
export default function makeHotReload ({ models, broker } = {}) {
  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.hotReload(), hotReload)

  const events = [...domainEvents].filter(e => /^pool.*/.test(e))
  models
    .getModelSpecs()
    .map(spec => spec.modelName)
    .forEach(pool =>
      events.forEach(event =>
        ThreadPoolFactory.listen(
          data => broker.notify(data.eventName, data),
          pool,
          event(pool)
        )
      )
    )

  /**
   */
  async function hotReload (modelName) {
    if (inProgress) {
      return { status: 'reload already in progress' }
    }
    inProgress = true

    return new Promise(async resolve => {
      try {
        if (modelName && modelName !== '*') {
          await ThreadPoolFactory.reload(modelName)
          return resolve(ThreadPoolFactory.status(modelName))
        } else {
          await ThreadPoolFactory.reloadAll()
          return resolve(ThreadPoolFactory.status())
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

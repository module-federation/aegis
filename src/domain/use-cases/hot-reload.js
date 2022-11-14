'use strict'

import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool'

// const config = require(path.resolve(process.cwd(), 'webpack.config.js'))
// import webpack from 'webpack'
// import path from 'path'
// // import { cp } from 'fs'
// // import compose from '../util/compose'

// const compiler = webpack(config)

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
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} createModel
 * @param {dependencies} param0
 * @returns {function():Promise<import('../domain').Model>}
 */

// async function compile () {
//   await new Promise((resolve, reject) => {
//     compiler.run((err, res) => {
//       if (err) {
//         return reject(err)
//       }
//       resolve(res)
//     })
//   })
// }

let inProgress = false

/**
 *
 * @param {factoryParam} param0
 * @returns
 */
export default function makeHotReload ({ models, broker } = {}) {
  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.hotReload, hotReload)

  /**
   */
  async function hotReload (modelName) {
    if (inProgress) {
      return { status: 'reload already in progress' }
    }
    inProgress = true

    try {
      if (modelName && modelName !== '*') {
        const spec = models.getModelSpec(modelName.toUpperCase())
        if (!spec) throw new Error(`model not found ${modelName}`)
        const poolName = spec.domain || modelName
        // compile()
        console.log('reloading pool', poolName)
        await ThreadPoolFactory.reload(poolName)
        return ThreadPoolFactory.status(poolName)
      } else {
        // compile()
        console.log('reloading all pools')
        await ThreadPoolFactory.reloadPools()
        return ThreadPoolFactory.status()
      }
    } catch (error) {
      console.log({ fn: hotReload.name, error })
    } finally {
      inProgress = false
    }
  }

  return hotReload
}

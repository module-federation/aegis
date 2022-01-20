'use strict'

import * as fs from 'fs'
import path from 'path'
import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool.js'
//import webpack from 'webpack'

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

  // function compileEntries (remoteEntries) {
  //   const compiler = webpack({
  //     // [Configuration Object](/configuration/)
  //   });

  //   compiler.run((err, stats) => { // [Stats Object](#stats-object)
  //     // ...

  //     compiler.close((closeErr) => {
  //       // ...
  //     });
  //   });

  // }

  function registerNewModel (remoteEntry) {
    // fs.writeFileSync(
    //   path.resolve(process.cwd(), 'webpack/remote-entries', remoteEntry.modelFile),
    //   JSON.stringify(remoteEntry.modelEntries)
    // )
    // fs.writeFileSync(
    //   path.resolve(process.cwd(), 'webpack', 'remote-entries.js'),
    //   JSON.stringify(remoteEntry.mainEntries)
    // )
  }

  async function hotReload ({ modelName, remoteEntry = null }) {
    const model = modelName.toUpperCase()

    if (isMainThread) {
      if (model) {
        if (model === '*') {
          await ThreadPoolFactory.reloadAll()
          return { status: `reload complete for all thread pools` }
        }

        if (model) {
          await ThreadPoolFactory.reload(model)
          return {
            status: `reload complete for thread pool ${model}`,
            modelName: model
          }
        }

        if (remoteEntry) {
          registerNewModel(remoteEntry)
          return {
            status: 'thread pool and remote-entry created for new model',
            modelName: model
          }
        }

        const pools = ThreadPoolFactory.listPools().map(p => p.toUpperCase())
        const allModels = models
          .getModelSpecs()
          .map(spec => spec.modelName.toUpperCase())

        pools
          .filter(poolName => !allModels.includes(poolName))
          .forEach(async poolName => await ThreadPoolFactory.dispose(poolName))
      }
      return {
        status: `no model specified; specify .../reload?modelName=<modelName>`
      }
    }
  }

  return hotReload
}

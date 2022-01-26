'use strict'

import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool.js'
//import webpack from 'webpack'

const { poolClose, poolOpen } = domainEvents

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

  /**
   *
   * @param {{
   *  modelName:string
   *  remoteEntry:import('../../../webpack/remote-entries-type')
   *  sendMsg: function(string)
   * }} param0
   * @returns
   */
  async function hotReload ({ modelName, remoteEntry = null, sendMsg }) {
    const model = modelName.toUpperCase()

    if (isMainThread) {
      if (inProgress) {
        return { status: 'reload already in progress' }
      }
      inProgress = true

      return new Promise(async resolve => {
        try {
          if (model) {
            if (model === '*') {
              try {
                http
                await ThreadPoolFactory.reloadAll()
                inProgress = false
                return resolve({
                  status: `threadpools restarted for all models`,
                  modelName: model
                })
              } catch (error) {
                console.error(hotReload.name, error)
                return
              }
            }

            if (model) {
              try {
                sendMsg(`beginning deployment of model ${model}...`)

                ThreadPoolFactory.listen(
                  () => sendMsg('20% complete'),
                  [model],
                  [poolClose(model)]
                )

                ThreadPoolFactory.listen(
                  () => sendMsg('80% complete'),
                  [model],
                  [poolOpen(model)]
                )

                await ThreadPoolFactory.reload(model)

                setTimeout(() => (inProgress = false), 2000)

                if (!remoteEntry) {
                  return resolve({
                    status: `threadpool up for ${model}`,
                    modelName: model
                  })
                }
              } catch (error) {
                console.log(hotReload.name, error)
                return
              }
            }

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
          }

          if (remoteEntry) {
            registerNewModel(remoteEntry)
            return resolve({
              status: 'thread pool and remote-entry created for new model',
              modelName: model
            })
          }

          inProgress = false
        } catch (error) {
          console.error(hotReload.name, error)
        }
      })
    }
  }

  return hotReload
}

'use strict'

import { dependencies } from 'webpack'
import { isMainThread } from 'worker_threads'
import { AppError } from '../util/app-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} invokePort
 * @param {ModelParam} param0
 * @returns {function():Promise<im`port("../domain/model").Model>}
 */
export default function makeInvokePort ({
  broker,
  repository,
  threadpool,
  modelName,
  models,
  authorize = async x => await x()
} = {}) {
  /**
   *
   * @param {{id:string,model:import('..').Model,args:string[],port:string}} input
   * @returns
   */
  return async function invokePort (input) {
    async function findModel (id) {
      if (id) return await repository.find(id)
      return models.getService(modelName, repository, broker)
    }

    // function findCallback (port) {
    //   try {
    //     return models.getModelSpec(modelName).ports[port].callback
    //   } catch (error) {: 'no callback' })
    //     return null
    //     console.log({ fn: invokePort.name, port, msg
    //   }
    // }

    if (isMainThread) {
      return threadpool.runJob(invokePort.name, input)
    } else {
      try {
        const { id = null, port } = input
        const model = await findModel(id)
        console.log({ model })
        return await model[port](input)
      } catch (error) {
        return AppError(error)
      }
    }
  }
}

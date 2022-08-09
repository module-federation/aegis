'use strict'

import { isMainThread } from 'worker_threads'
import AppError from '../util/app-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} editModel
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
export default function makeInvokePort ({
  broker,
  repository,
  threadpool,
  modelName,
  models
} = {}) {
  /**
   *
   * @param {{id:string,model:import('..').Model,args:string[],port:string}} input
   * @returns
   */
  async function invokePort (input) {
    if (isMainThread) {
      const result = await threadpool.run(invokePort.name, input)
      if (result.hasError) throw new Error(result.message)

      return result
    } else {
      try {
        const { id = null, port, args } = input
        const model = id
          ? await repository.find(id)
          : models.createModel(broker, repository, modelName, args)

        if (!model) {
          return AppError('no such id')
        }

        return (await model[port](...args)) || model
      } catch (e) {
        console.error(invokePort.name, e)
        return AppError(e)
      }
    }
  }

  return invokePort
}

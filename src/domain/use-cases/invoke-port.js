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
  models,
  authorize = async x => await x()
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
        const { id, port, args } = input
        const model = id
          ? await repository.find(id)
          : await models.createModel(broker, repository, modelName, args)

        if (!model) return AppError('no such id')

        if (typeof model[port] !== 'function')
          AppError(`${modelName}.${port} is not a function`)

        return authorize(async () => await model[port](...args))
      } catch (error) {
        console.error(invokePort.name, error)
        return AppError(error)
      }
    }
  }

  return invokePort
}

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
export default function makeInvokePort ({ repository, threadpool } = {}) {
  /**
   *
   * @param {{id:string,model:import('..').Model,args:string[],port:string}} input
   * @returns
   */
  async function invokePort (input) {
    if (isMainThread) {
      const updated = await threadpool.run(invokePort.name, input)
      if (updated.hasError) throw new Error(updated.message)

      return updated
    } else {
      try {
        const { id, port, args } = input
        const model = await repository.find(id)

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

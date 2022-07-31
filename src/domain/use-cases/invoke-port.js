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
  repository,
  threadpool,
  models,
  broker,
  modelName
} = {}) {
  async function getModelInstance (input) {
    if (input.id) {
      const model = repository.find(input.id)
      if (!model) throw new Error('no such id')
      return model
    }

    const model = await models.createModel(broker, repository, modelName, input)
    return repository.save(model.getId(), model)
  }

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
        const { port, args } = input
        const model = await getModelInstance(input)
        return (await model[port](...args)) || model
      } catch (error) {
        console.error({ fn: invokePort.name, error })
        return AppError(error)
      }
    }
  }

  return invokePort
}

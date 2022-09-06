'use strict'

import { isMainThread } from 'worker_threads'

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
  return async function invokePort (input) {
    if (isMainThread) {
      const result = await threadpool.runJob(invokePort.name, input)
      if (result instanceof Error) throw result
      return result
    } else {
      try {
        const { id = null, port, args } = input
        const model =
          typeof id === undefined
            ? await repository.find(id)
            : models.createModel(broker, repository, modelName, args)

        if (!model) throw new Error('no such id')

        const callback = model.getPorts()[port].callback || (x => x)
        return await model[port](input, callback)
      } catch (error) {
        return new Error(error)
      }
    }
  }
}

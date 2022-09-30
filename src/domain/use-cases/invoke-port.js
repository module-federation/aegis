'use strict'

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
  async function findModelService (id = null) {
    if (id) {
      return repository.find(id)
    }
    return models.getService(modelName, repository, broker)
  }
  /**
   *
   * @param {{id:string,model:import('..').Model,args:string[],port:string}} input
   * @returns
   */
  return async function invokePort (input) {
    if (isMainThread) {
      return threadpool.runJob(invokePort.name, input)
    } else {
      try {
        const { id = null, port } = input
        const service = await findModelService(id)
        return await service[port](input)
      } catch (error) {
        return AppError(error)
      }
    }
  }
}

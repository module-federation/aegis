'use strict'

import executeCommand from './execute-command'
import async from '../util/async-error'
import domainEvents from '../domain-events'
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
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  /**
   *
   * @param {{id:string,changes:object,command:string}} input
   * @returns
   */
  async function invokePort (input) {
    if (isMainThread) {
      const model = await repository.find(input.id)
      if (!model) {
        throw new Error('no such id')
      }
      const updated = await threadpool.run(invokePort.name, input)
      if (updated.hasError) throw new Error(updated.message)
      return updated
    } else {
      try {
        const { model, port, args } = input
        return await model[port](args)
      } catch (e) {
        console.error(invokePort.name, e)
        return AppError(e)
      }
    }
  }

  return invokePort
}

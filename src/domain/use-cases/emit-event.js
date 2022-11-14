'use strict'

import { isMainThread, workerData } from 'worker_threads'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {import('../thread-pool').ThreadPool} threadpool
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} emitEvent
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
export default function makeEmitEvent ({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  /**
   *
   * @param {{eventName:string,...}} input
   * @returns
   */
  return async function emitEvent (input) {
    try {
      if (isMainThread) {
        try {
          await threadpool.fireEvent(input)
        } catch (error) {
          throw error
        }
      } else {
        console.debug({ pool: workerData.poolName, fn: emitEvent.name, input })
        broker.notify(input.eventName, input)
      }
    } catch (error) {
      console.error({ fn: emitEvent.name, error })
    }
  }
}

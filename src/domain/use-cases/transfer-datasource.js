'use strict'

import { isMainThread, workerData } from 'worker_threads'
import domainEvents from '../domain-events'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} emitEvent
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
export default function makeTransferDatasource ({
  modelName,
  models,
  datasources,
  threadpool,
  broker,
  handlers = []
} = {}) {
  /**
   *
   * @param {{eventName:string,...}} input
   * @returns
   */
  return async function transferDatasource (input) {
    try {
      if (!isMainThread) {
        console.debug({
          pool: workerData.modelName,
          fn: transferDatasource.name,
          input
        })

        datasources.getSharedDataSource(input.name, {
          dsMap: input.dsMap
        })

        const eventName = domainEvents.externalCacheResponse(
          workerData.modelName
        )
        const eventType = domainEvents.externalCacheResponse.name
        broker.notify(eventName, { eventName, eventType })
      }
    } catch (error) {
      console.error({ fn: transferDatasource.name, error })
    }
  }
}

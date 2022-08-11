'use strict'

import { isMainThread } from 'worker_threads'
import AppError from '../util/app-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory} models
 * @property {import('../datasource').default} repository
 * @property {import('../event-broker').EventBroker} broker
 * @property {...Function} handlers
 */

/**
 * @callback removeModel
 * @param {string} id
 * @returns {Promise<import("..").Model>}
 */

/**
 * @param {ModelParam} param0
 * @returns {removeModel}
 */
export default function removeModelFactory ({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.DELETE
  const eventName = models.getEventName(eventType, modelName)
  handlers.forEach(handler => broker.on(eventName, handler))

  return async function removeModel (id) {
    if (isMainThread) {
      const model = await repository.find(id)

      if (!model) {
        throw new Error('no such id')
      }

      return threadpool.run(removeModel.name, id)
    } else {
      const model = await repository.find(id)
      const deleted = models.deleteModel(model)
      const event = models.createEvent(eventType, modelName, deleted)

      const [brokerResult, repoResult] = await Promise.allSettled([
        broker.notify(eventName, event),
        repository.delete(id)
      ])

      if (brokerResult.status === 'rejected') {
        if (repoResult.status === 'fulfilled') {
          // event failed, put it back
          await repository.save(input.id, model)
        }
        throw new Error('model not deleted ' + obsResult.reason)
      }

      return deleted
    }
  }
}

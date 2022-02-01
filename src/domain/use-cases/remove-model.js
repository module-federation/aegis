'use strict'

import { isMainThread } from 'worker_threads'
import AegisError from '../util/aegis-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../domain').ModelFactory} models
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
      const result = await threadpool.run(removeModel.name, id)
      if (result.hasError) throw new Error(result.message)
      return result
    } else {
      const model = await repository.find(id)
      if (!model) {
        return AegisError('no such id')
      }

      const deleted = models.deleteModel(model)
      const event = await models.createEvent(eventType, modelName, deleted)

      const [obsResult, repoResult] = await Promise.allSettled([
        broker.notify(event.eventName, event),
        repository.delete(id)
      ])

      if (obsResult.status === 'rejected') {
        if (repoResult.status === 'fulfilled') {
          await repository.save(id, model)
        }
        throw new Error('model not deleted', obsResult.reason)
      }

      return model
    }
  }
}

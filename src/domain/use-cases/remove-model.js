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

  return async function removeModel (input) {
    if (isMainThread) {
      const model = await repository.find(input.id)
      if (!model) {
        throw new Error('no such id')
      }
      const result = await threadpool.run(removeModel.name, {
        id: input.id,
        model
      })
      if (result.hasError) throw new Error(result.message)
      return result
    } else {
      const hydratedModel = models.loadModel(
        broker,
        repository,
        input.model,
        modelName
      )

      try {
        const deleted = models.deleteModel(hydratedModel)
        const event = await models.createEvent(eventType, modelName, deleted)

        const [obsResult, repoResult] = await Promise.allSettled([
          broker.notify(eventName, event),
          repository.delete(input.id)
        ])

        if (obsResult.status === 'rejected') {
          if (repoResult.status === 'fulfilled') {
            await repository.save(input.id, hydratedModel)
          }
          return new AppError('model not deleted', obsResult.reason)
        }

        return hydratedModel
      } catch (error) {
        return AppError(error)
      }
    }
  }
}

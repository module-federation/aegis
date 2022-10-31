'use strict'

import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import { AppError } from '../util/app-error'

/** @todo abstract away thread library */

/**
 * @typedef {Object} injectedDependencies injected dependencies
 * @property {String} modelName - name of the domain model
 * @property {import('../model-factory').ModelFactory} models - model factory
 * @property {import('../datasource').default } repository - model datasource adapter
 * @property {import('../thread-pool.js').ThreadPool} threadpool
 * @property {import('../event-broker').EventBroker} broker - application events, propagated to domain
 * @property {...import('../index').eventHandler} handlers - {@link eventHandler} configured in the model spec.
 */

/** @typedef {function(*):Promise<import("../domain").Model>} createModel */

/**
 * @param {injectedDependencies} param0
 * @returns {createModel}
 */
export default function makeCreateModel ({
  modelName,
  models,
  repository,
  threadpool,
  idempotent,
  broker,
  handlers = [],
} = {}) {
  const eventType = models.EventTypes.CREATE
  const eventName = models.getEventName(eventType, modelName)
  handlers.forEach((handler) => broker.on(eventName, handler))
  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.createModel(modelName), createModel)

  /** @type {createModel} */
  async function createModel (input) {
    if (isMainThread) {
      const existingRecord = await idempotent()
      if (existingRecord) return existingRecord

      return threadpool.runJob(createModel.name, input, modelName)
    } else {
      try {

        const model = models.createModel(broker, repository, modelName, input)
        await repository.save(model.getId(), model)
        console.debug({ fn: createModel.name, model })
        try {
          const event = models.createEvent(eventType, modelName, model)
          broker.notify(eventName, event)
        } catch (error) {
          // remove the object if not processed
          await repository.delete(model.getId())
          return AppError(error)
        }

        // Return the latest changes
        return repository.find(model.getId())
      } catch (error) {
        return AppError(error)
      }
    }
  }

  return createModel
}

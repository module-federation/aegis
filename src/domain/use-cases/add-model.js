'use strict'

import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import AppError from '../util/app-error'

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

/** @typedef {function(*):Promise<import("../domain").Model>} addModel */

/**
 * @param {injectedDependencies} param0
 * @returns {addModel}
 */
export default function makeAddModel ({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.CREATE
  const eventName = models.getEventName(eventType, modelName)
  handlers.forEach(handler => broker.on(eventName, handler))

  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.addModel(modelName), addModel)

  /** @type {addModel} */
  async function addModel (input) {
    try {
      if (isMainThread) {
        const model = await threadpool.run(addModel.name, input)
        if (model.hasError) throw new Error(model.message)
        return repository.save(model.id, model)
      } else {
        const model = await models.createModel(
          broker,
          repository,
          modelName,
          input
        )
        await repository.save(model.getId(), model)

        try {
          const event = models.createEvent(eventType, modelName, model)
          await broker.notify(eventName, event)
        } catch (error) {
          // remote the object if not processed
          await repository.delete(model.getId())
          return AppError(error)
        }

        // Return the latest changes
        return repository.find(model.getId())
      }
    } catch (error) {
      return AppError(error)
    }
  }

  return addModel
}

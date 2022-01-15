'use strict'

import { LoggerLevel } from 'mongodb'
import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'
import ThreadPoolFactory from '../thread-pool.js'

/**
 * @typedef {Object} dependencies injected dependencies
 * @property {String} modelName - name of the domain model
 * @property {import('../model-factory').ModelFactory} models - model factory
 * @property {import('../datasource').default } repository - model datasource adapter
 * @property {import('../thread-pool.js').ThreadPool} threadpool
 * @property {import('../event-broker').EventBroker} broker - application events, propagated to domain
 * @property {...import('../index').eventHandler} handlers - {@link eventHandler} configured in the model spec.
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} addModel
 * @param {dependencies} param0
 * @returns {function():Promise<import('../domain').Model>}
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

  async function addModel (input) {
    let model

    if (isMainThread) {
      model = await threadpool
        .getThreadPool(modelName)
        .runTask(addModel.name, input)
      return repository.save(model.id, model)
    } else {
      try {
        model = await models.createModel(broker, repository, modelName, input)
        await repository.save(model.getId(), model)
      } catch (error) {
        throw new Error(error)
      }

      try {
        const event = await models.createEvent(eventType, modelName, model)
        await broker.notify(event.eventName, event)
      } catch (error) {
        // remote the object if not processed
        await repository.delete(model.getId())
        throw new Error(error)
      }

      // Return the latest changes
      return repository.find(model.getId())
    }
  }

  return addModel
}

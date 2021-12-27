'use strict'

import domainEvents from '../domain/domain-events'

/**
 * @typedef {Object} dependencies injected dependencies
 * @property {String} modelName - name of the domain model
 * @property {import('../domain/model-factory').ModelFactory} models - model factory
 * @property {import('../domain/datasource').default repository - model datasource adapter
 * @property {import('../domain/event-broker').EventBroker} broker - application events, propagated to domain
 * @property {...import('../domain/index').eventHandler} handlers - {@link eventHandler} configured in the model spec.
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
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.CREATE
  const eventName = models.getEventName(eventType, modelName)
  handlers.forEach(handler => broker.on(eventName, handler))

  // Add an event whose callback invokes this factory.
  broker.on(domainEvents.addModel(modelName), addModel)

  async function addModel (input) {
    const model = await models.createModel(broker, repository, modelName, input)

    try {
      await repository.save(model.getId(), model)
    } catch (error) {
      throw new Error(error)
    }

    try {
      if (!model.isCached()) {
        const event = await models.createEvent(eventType, modelName, model)
        await broker.notify(event.eventName, event)
      }
    } catch (error) {
      // remote the object if not processed
      await repository.delete(model.getId())
      throw new Error(error)
    }

    // Return the latest changes
    return repository.find(model.getId())
  }

  return addModel
}

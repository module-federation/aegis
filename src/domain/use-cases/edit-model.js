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
export default function makeEditModel ({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.UPDATE
  const eventName = models.getEventName(eventType, modelName)
  handlers.forEach(handler => broker.on(eventName, handler))

  // Add an event that can be used to edit this model
  broker.on(domainEvents.editModel(modelName), editModel)

  /**
   *
   * @param {{id:string,changes:object,command:string}} input
   * @returns
   */
  async function editModel (input) {
    if (isMainThread) {
      const model = await repository.find(input.id)

      if (!model) {
        throw new Error('no such id')
      }

      const result = await threadpool.run(editModel.name, input)
      if (result instanceof AppError) throw result
      return result
    } else {
      try {
        // model has been found by main thread
        const { id, changes, command } = input

        // get model
        const model = await repository.find(id)

        // only the worker does the update
        const updated = models.updateModel(model, changes)
        await repository.save(id, updated)

        const event = models.createEvent(eventType, modelName, {
          updated,
          changes
        })

        try {
          await broker.notify(eventName, event)

          if (command) {
            const result = await async(
              executeCommand(updated, command, 'write')
            )

            if (result.ok) {
              return result.data
            }
          }
          return await repository.find(id)
        } catch (error) {
          console.error(editModel.name, error)
          await repository.save(id, model)
        }
      } catch (error) {
        return new AppError(error)
      }
    }
  }

  return editModel
}

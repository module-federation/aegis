'use strict'

import executeCommand from './execute-command'
import async from '../util/async-error'
import domainEvents from '../domain-events'
import { isMainThread } from 'worker_threads'
import { AppError } from '../util/app-error'

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

      if (!model) throw new Error('Not Found')

      return threadpool.runJob(editModel.name, input, modelName)
    } else {
      try {
        // model has been found by main thread
        const { id, changes, command } = input

        // get model
        const model = await repository.find(id)
        console.debug({ model })

        // only the worker does the update
        const updated = await models.updateModel(model, changes)

        console.debug({ updated })
        await repository.save(id, updated)

        const event = models.createEvent(eventType, modelName, {
          updated,
          changes
        })

        try {
          broker.notify(eventName, event)

          if (command) {
            const result = await async(
              executeCommand(updated, command, 'write')
            )
            if (result.ok) return result.data
          }
          return await repository.find(id)
        } catch (error) {
          await repository.save(id, model)
          return AppError(error)
        }
      } catch (error) {
        return AppError(error)
      }
    }
  }

  return editModel
}

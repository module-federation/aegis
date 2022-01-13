'use strict'

import executeCommand from './execute-command'
import invokePort from './invoke-port'
import async from '../util/async-error'
import domainEvents from '../domain-events'
import { isMainThread } from 'worker_threads'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../domain/model-factory').ModelFactory} models
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

  async function editModel (input) {
    const { id, changes, command, model = {} } = input

    if (isMainThread) {
      // let the main thread lookup;
      // don't do it again in the worker
      model = await repository.find(id)
    }

    if (!model) {
      throw new Error('no such id')
    }

    try {
      let updated

      if (isMainThread) {
        updated = threadpool.runTask(editModel.name, {
          id,
          changes,
          command,
          model
        })
      } else {
        updated = models.updateModel(model, changes)
      }

      try {
        await repository.save(id, updated)
      } catch (error) {
        throw new Error(error)
      }

      try {
        const event = await models.createEvent(eventType, modelName, {
          updated,
          changes
        })

        await broker.notify(event.eventName, event)
      } catch (error) {
        await repository.save(id, model)
        throw new Error(error)
      }

      if (command) {
        const result = await async(executeCommand(updated, command, 'write'))
        if (result.ok) {
          return result.data
        }
      }

      return await repository.find(id)
    } catch (error) {
      throw new Error(error)
    }
  }

  return editModel
}

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
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} emitEvent
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
export default function makeEmitEvent ({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  /**
   *
   * @param {{eventName:string,...}} input
   * @returns
   */
  async function emitEvent (input) {
    try {
      if (isMainThread) {
        await threadpool.fireEvent(input)
      } else {
        await broker.notify(input.eventName, input)
      }
    } catch (error) {
      console.error({ fn: emitEvent.name, error })
    }
  }

  return emitEvent
}

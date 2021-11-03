'use strict'
import uuid from './util/uuid'

/**
 * @typedef {import('../domain').Model} Model
 * @typedef {string} serviceName
 *
 * @typedef {Object} EventMessage
 * @property {serviceName} eventSource
 * @property {serviceName|"broadcast"} eventTarget
 * @property {"command"|"commandResponse"|"notification"|"import"} eventType
 * @property {string} eventName
 * @property {string} eventTime
 * @property {string} eventUuid
 * @property {NotificationEvent|ImportEvent|CommandEvent} eventData
 *
 * @typedef {object} ImportEvent
 * @property {"service"|"model"|"adapter"} type
 * @property {string} url
 * @property {string} path
 * @property {string} importRemote
 *
 * @typedef {object} NotificationEvent
 * @property {string|} message
 * @property {"utf8"|Uint32Array} encoding
 *
 * @typedef {Object} CommandEvent
 * @property {string} commandName
 * @property {string} commandResp
 * @property {*} commandArgs
 */

/**
 * @typedef {{
 *  filter:function(message):Promise<void>,
 *  unsubscribe:function()
 * }} Subscription
 * @typedef {string|RegExp} topic
 * @callback eventHandler
 * @param {string} eventData
 * @typedef {eventHandler} notifyType
 * @typedef {{
 * listen:function(topic, x),
 * notify:notifyType
 * }} EventService
 * @callback adapterFactory
 * @param {EventService} service
 * @returns {function(topic, eventHandler)}
 */
import { Event } from '../services/event-service'

/**
 * @type {Map<any,Map<string,*>>}
 */
const subscriptions = new Map()

/**
 * Test the filter.
 * @param {string} message
 * @returns {function(string|RegExp):boolean} did the filter match?
 */
function filterMatches (message) {
  return function (filter) {
    const regex = new RegExp(filter)
    const result = regex.test(message)
    if (result)
      console.debug({
        func: filterMatches.name,
        filter,
        result,
        message: message.substring(0, 100).concat('...')
      })
    return result
  }
}

function getIdFilter (model, filters) {
  if (!filters && model) {
    const modelId = model.getId() || model.id
    const idFilter = [new RegExp(`/^${modelId}$/`)]
    return {
      modelId,
      idFilter
    }
  }
  return {}
}

/**
 * @typedef {string} message
 * @typedef {string|RegExp} topic
 * @param {{
 *  id:string,
 *  callback:function(message,Subscription),
 *  eventName:topic,
 *  filter:string|RegExp,
 *  once:boolean,
 *  model:import("../domain").Model
 * }} options
 */
const Subscription = function ({
  eventName,
  callback,
  model,
  id = uuid(),
  filters = [],
  once = true
}) {
  if (eventName || typeof callback !== 'function') {
    console.warn(Subscription.name, 'args invalid', eventName, callback)
    return
  }
  const { modelId, idFilter } = getIdFilter(model, filters)

  return {
    /**
     * unsubscribe from topic
     */
    unsubscribe () {
      subscriptions.get(eventName).delete(id)
    },

    getId () {
      return id
    },

    getModel () {
      return model
    },

    getSubscriptions () {
      return [...subscriptions.entries()]
    },

    /**
     * Filter message and invoke callback
     * @param {string} message
     */
    async filter (message) {
      const event = typeof message === 'string' ? JSON.parse(message) : message

      if (modelId && (event.modelId || event.model.id)) {
        return callback(event, this)
      }

      if (idFilter) {
        filters.concat(idFilter)
      }

      if (filters) {
        // Every filter must match.
        if (filters.every(filterMatches(JSON.stringify(event)))) {
          if (once) {
            // Only looking for 1 msg, got it.
            this.unsubscribe()
          }
          await callback({ message, subscription: this })
          return
        }
        // no match
        return
      }
      // no filters defined, just invoke the callback.
      await callback({ message, subscription: this })
    }
  }
}

/**
 * Listen for external events with default event service if none specified.
 * @type {adapterFactory}
 * @param {import('../services/event-service').Event} [service] - has default service
 */
export function on (service) {
  return async function (
    eventName,
    callback,
    { model, id = uuid(), filters, once }
  ) {
    const subscription = Subscription({
      eventName,
      callback,
      model,
      id,
      filters,
      once
    })

    if (subscriptions.has(eventName)) {
      subscriptions.get(eventName).set(id, subscription)
      return subscription
    }

    subscriptions.set(eventName, new Map().set(id, subscription))

    service.on(eventName, async function ({ eventName, message }) {
      if (subscriptions.has(eventName)) {
        await Promise.allSettled(
          subscriptions
            .get(eventName)
            .map(async subscription => subscription.filter(message))
        )
      }
    })

    return subscription
  }
}

/**
 * @type {adapterFactory}
 * @returns {function(topic, eventData)}
 */
export function notify (service = Event) {
  return async function ({ model, args: [topic, message] }) {
    console.debug('sending...', { topic, message: JSON.parse(message) })
    await service.notify(topic, message)
    return model
  }
}

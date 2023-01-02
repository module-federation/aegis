'use strict'

import { withId, withTimestamp } from './mixins'
import uuid from '../domain/util/uuid'
import pipe from './util/pipe'

/**
 * @typedef {import('./model-factory').EventType} EventType
 */

/**
 * @typedef {{
 *  factory: function(*):any,
 *  args: any,
 *  eventType: EventType,
 *  modelName: String
 * }} options
 */

/**
 * @typedef {Object} Event
 * @property {import('.').Model} model
 * @property {string} modelId
 * @property {string} eventId
 * @property {String} eventName
 * @property {String} modelName
 * @property {number} eventTime
 * @property {object} [eventData]
 * @property {string} [eventCode]
 * @property {number} [eventRank]
 * @property {string[]} [eventTags]
 * @property {string} [eventSource] msg sent from this serviced
 * @property {string} [eventTarget] send msg to this service
 * @property {'balanceEventConsumer'|'broadcastEventConsumer'|'balanceEventTarget'|'broadcastEventTarget'
 * |'broadcast'|'host'|'uplink'} [route] specifies the routing algo, default is broadcast
 * @property {EventType} [eventType]
 */

/**
 * @namespace
 */
const Event = (() => {
  /**
   * @lends Event
   * @namespace
   * @class
   * @param {options} options
   * @returns {Readonly<Event>}
   */
  const Event = ({
    factory,
    args = {},
    eventType,
    eventName,
    modelName
  } = {}) => ({
    eventName:
      eventName ||
      (eventType && modelName && eventType.concat(modelName)).toUpperCase(),
    eventType,
    modelName,
    eventSource: modelName?.toUpperCase(),
    ...(factory ? factory(args) : args)
  })

  const makeEvent = pipe(
    Event,
    withTimestamp('eventTime'),
    withId('eventId', uuid),
    Object.freeze
  )

  return {
    /**
     * Create event
     * @param {options} options
     * @returns {Readonly<Event>}
     */
    create: options => makeEvent(options)
  }
})()

export default Event

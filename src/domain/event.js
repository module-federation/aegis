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
 * @property {string} [eventRank]
 * @property {string} [eventTags]
 * @property {string} [eventSource]
 * @property {string} [eventTarget]
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
  const Event = ({ factory, args = {}, eventType, modelName } = {}) => ({
    eventName:
      eventType && modelName && eventType.concat(modelName).toUpperCase(),
    eventType,
    modelName,
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

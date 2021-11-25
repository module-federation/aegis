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
 * @property {Model} model
 * @property {EventType} eventType
 * @property {String} eventName
 * @property {String} eventUuid
 * @property {String} eventTime
 * @property {String} modelName
 * @property {Object} modelData
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
    withId('eventUuid', uuid),
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

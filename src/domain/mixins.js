'use strict'

import pipe from './util/pipe'

/**
 * @callback functionalMixin
 * @param {Object} o - Object to compose
 * @returns {Object} - Composed object
 */

/**
 * @callback functionalMixinFactory
 * @param {*} mixinFunctionParams params for mixin function
 * @returns {functionalMixin}
 */

/**
 *
 */
export const time = () => new Date().getTime()

/**
 * Add a unique identifier
 * @param {Function} fnCreateId function that returns unique id
 */
export const withId = (propName, fnCreateId) => {
  return o => ({ ...o, [propName]: fnCreateId() })
}

/**
 * Add a timestamp
 * @param {string} propName name of property to add
 * @param {Function} [fnTimestamp] default is UTC
 */
export const withTimestamp = (propName, fnTimestamp = time) => {
  return o => ({ [propName]: fnTimestamp(), ...o })
}

/**
 * Convert keys from (e.g. from symbols to strings)
 * when the object is serialized so the properties
 * can be included in JSON output.
 * @param {{key: string, value: Symbol}} keyMap
 */
export const fromKey = keyMap => o => {
  const toMapValues = () =>
    Object.keys(keyMap)
      .map(k => ({ [k]: o[keyMap[k]] }))
      .reduce((p, c) => ({ ...p, ...c }))

  return {
    ...o,
    ...toMapValues()
  }
}

/**
 * Convert keys from strings to symbols when
 * the object is deserialized.
 * @param {{key: string, value: Symbol}} keyMap
 */
export const toKey = keyMap => o => {
  function fromMapValues () {
    return Object.keys(keyMap)
      .map(k => (o[k] ? { [keyMap[k]]: o[k] } : {}))
      .reduce((p, c) => ({ ...p, ...c }))
  }
  return {
    ...o,
    ...fromMapValues()
  }
}

/**
 * Convert timestamp number to formatted date string.
 * @param {number[]} timestamps
 * @param {"utc"|"iso"} format
 */
export const fromTimestamp = (timestamps, format = 'utc') => o => {
  const formats = { utc: 'toUTCString', iso: 'toISOString' }
  const fn = formats[format]

  if (!fn) {
    throw new Error('invalid date format')
  }

  const stringifyTimestamps = () =>
    timestamps
      .map(k => (o[k] ? { [k]: new Date(o[k])[fn]() } : {}))
      .reduce((p, c) => ({ ...c, ...p }))

  return {
    ...o,
    ...stringifyTimestamps()
  }
}

/**
 * Adds `toJSON` method that pipes multiple serializing mixins together.
 * @param {...functionalMixin} keyMap
 */
export const withSerializers = (...funcs) => o => {
  return {
    ...o,
    toJSON () {
      return pipe(...funcs)(this)
    }
  }
}

/**
 * Pipes multiple deserializing mixins together.
 * @param  {...functionalMixin} funcs
 */
export const withDeserializers = (...funcs) => o => {
  function fromJSON () {
    return pipe(...funcs)(o)
  }
  return {
    ...o,
    ...fromJSON()
  }
}

/**
 * Subscribe to and emit application and domain events.
 * @param {import('./event-broker').EventBroker} broker
 */
export const withbroker = broker => o => {
  return {
    ...o,
    async emit (eventName, eventData) {
      broker.notify(eventName, eventData)
    },
    subscribe (eventName, callback) {
      broker.on(eventName, callback)
    }
  }
}

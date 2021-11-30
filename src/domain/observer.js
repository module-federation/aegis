/**
 * typedef {import('./event').Event} Event
 * @typedef {import('.').Model} Model
 */

import Event from './event'
import domainEvents from './domain-events'

const { forwardEvent } = domainEvents
const DEBUG = process.env.DEBUG

/**
 * @callback eventHandler
 * @param {import('./event').Event} eventData
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} defaultOptions
 * @property {object} [filters] - matching key value pairs have to be found in the event data
 * @property {boolean} [subscribed] - subscription id has to be found in returned event data
 * @property {boolean} [once] - only run this handler once
 * @property {boolean} [singleton] - only register this handler once. To unsubscribe:
 * ```
 * const subscription = model.on(eventName, eventData => console.log(eventData))
 * subscription.unsubscribe()
 * ```
 */

/**
 * @type {defaultOptions}
 */
const defaultOptions = {
  once: false,
  filters: Object,
  singleton: false,
  subscribed: false
}

/**
 * Abstract observer
 */
export class Observer {
  /**
   *
   * @param {Map<string | RegExp, eventHandler[]>} eventHandlers
   */
  constructor (eventHandlers) {
    this.handlers = eventHandlers
  }

  /**
   * Register callback `handler` to fire on event `eventName`
   * @param {String | RegExp} eventName
   * @param {eventHandler} handler
   * @param {defaultOptions} [options]
   * `allowMultiple` true by default; if false, event can be handled by only one callback
   */
  on (eventName, handler, { ...defaultOptions }) {
    throw new Error('unimplemented abstract method')
  }

  /**
   * Fire event `eventName` and pass `eventData` to listeners.
   * @param {String} eventName - unique name of event
   * @param {Event} eventData - the import of the event
   * @param {{forward:boolean, eventUuid:string}} options - forward this event externally
   */
  async notify (eventName, eventData, options) {
    throw new Error('unimplemented abstract method')
  }
}

/**
 *
 * @param {Error} error
 */
const handleError = error => {
  console.error({ file: __filename, error })
}

/**
 *
 * @param {string} eventName
 * @param {import('./event').Event} eventData
 * @param {eventHandler} handle
 * @param {boolean} forward
 */
async function runHandler (eventName, eventData = {}, handle, forward) {
  const abort = eventData ? false : true

  console.assert(!DEBUG, 'handler running', {
    eventName,
    eventUuid: eventData?.eventUuid,
    handle: handle.toString(),
    model: eventData?.modelName,
    modelId: eventData?.modleId,
    abort,
    forward
  })

  if (abort) {
    console.warn('no data provided, abort')
    return
  }

  /**@type {eventHandler} */
  await handle(eventData)

  if (forward && eventName !== forwardEvent) {
    await this.notify(forwardEvent, eventData)
  }
}

/**
 *
 * @param {string} eventName
 * @param {import('./event').Event} eventData
 * @param {boolean} forward
 */
async function notify (eventName, eventData, options = {}) {
  const { eventUuid = null, forward = false } = options
  const run = runHandler.bind(this)

  if (!eventData) {
    console.warn('no data to publish', eventName)
    return
  }

  try {
    if (this.handlers.has(eventName)) {
      await Promise.allSettled(
        this.handlers.get(eventName).map(async handler => {
          await run(eventName, { eventUuid, ...eventData }, handler, forward)
        })
      )
    }

    await Promise.allSettled(
      [...this.handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) =>
          v.map(
            async f =>
              await run(eventName, { eventUuid, ...eventData }, f, forward)
          )
        )
    )
  } catch (error) {
    handleError(error)
  }
}

/**
 * @type {Observer}
 * @extends Observer
 */
class ObserverImpl extends Observer {
  /**
   * @override
   */
  constructor (eventHandlers) {
    super(eventHandlers)
    this.notify = notify.bind(this)
  }

  /**
   * @override
   * @param {string | RegExp} eventName
   * @param {eventHandler} handler
   * @param {defaultOptions} [options]
   */
  on (eventName, handler, options = {}) {
    const {
      once = false,
      filters = {},
      singleton = false,
      subscribed = false
    } = options

    if (!eventName || typeof handler !== 'function') {
      console.error(ObserverImpl.name, 'invalid arg', eventName, handler)
      return null
    }
    const filterKeys = Object.keys(filters)
    const subscription = Event.create({ eventName })

    const callbackWrapper = eventData => {
      const conditions = {
        filter: {
          applies: filterKeys.length > 0,
          satisfied: data => filterKeys.every(k => filterKeys[k] === data[k])
        },
        subscribed: {
          applies: subscribed,
          satisfied: data => data.eventUuid === subscription.eventUuid
        }
      }

      if (
        Object.values(conditions).every(
          condition => !condition.applies || condition.satisfied(eventData)
        )
      ) {
        if (once) this.off(eventName, callbackWrapper)
        return handler(eventData)
      }
    }

    subscription.unsubscribe = this.off(eventName, callbackWrapper)

    const funcs = this.handlers.get(eventName)
    if (funcs) {
      if (!singleton || funcs.length < 1) {
        funcs.push(callbackWrapper)
        return subscription
      }
      return null
    }
    this.handlers.set(eventName, [callbackWrapper])
    return subscription
  }

  /**
   *
   * @param {string} eventName
   * @param {()=>void} fn
   * @returns
   */
  off (eventName, fn) {
    let retval = false
    const funcs = this.handlers.get(eventName)
    if (funcs) {
      funcs.forEach((func, index, arr) => {
        if (func === fn) {
          retval = true
          arr.splice(index, 1)
        }
      })
    }
    return retval
  }

  serialize () {
    return JSON.stringify(
      [...this.handlers].map(([k, v]) => ({ [k]: v.map(fn => fn.toString()) })),
      null,
      2
    )
  }

  toString () {
    console.log('toString', this.serialize())
    return this.serialize()
  }
}

/**
 * @todo handle all state same way
 */
export const ObserverFactory = (() => {
  let instance

  function createInstance () {
    return new ObserverImpl(new Map())
  }

  return Object.freeze({
    /**
     * @returns {Observer} singleton
     */
    getInstance: function () {
      if (!instance) {
        instance = createInstance()
      }
      return instance
    }
  })
})()

export default ObserverFactory

/**
 * typedef {import('./event').Event} Event
 * @typedef {import('.').Model} Model
 */

import Event from './event'
import domainEvents from './domain-events'
import hash from './util/hash'

const { forwardEvent } = domainEvents
const DEBUG = process.env.DEBUG

/**
 * @callback eventHandler
 * @param {import('./event').Event} eventData
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} brokerOptions
 * @property {object} [filter] - matching key-value pairs, e.g. {id:123}, have to be found in the event data
 * @property {boolean} [subscriber] - the subscription id `eventId` has to be found in the event data
 * @property {boolean} [singleton] - there should be only one instance of this handler in the system
 * @property {boolean} [once] - run this handler only once, then unsubscribe. To code it manually:
 * ```
 * const listener = model.addListener(eventName, function (eventData) {
 *   // ...do something
 *   listener.unsubscribe()
 * })
 * ```
 * @property {number} [delay] - run handler at least `delay` milliseconds after the event is fired
 */

/**
 * @type {brokerOptions}
 */
const brokerOptions = {
  once: false,
  filter: {},
  singleton: false,
  subscriber: false,
  delay: 0
}

/**@type {Map<string | RegExp, eventHandler[]>}  */
const handlers = new Map()

/**
 * @abstract
 * Event broker - universal subject (a la observer pattern)
 */
export class EventBroker {
  /**
   *
   * param {Map<string | RegExp, eventHandler[]>} eventHandlers
   */
  constructor () {}

  /**
   * Register callback `handler` to fire on event `eventName`
   * @param {String | RegExp} eventName
   * @param {eventHandler} handler
   * @param {brokerOptions} [options]
   */
  on (eventName, handler, { ...brokerOptions }) {
    throw new Error('unimplemented abstract method')
  }

  /**
   * Fire event `eventName` and pass `eventData` to listeners.
   * @param {String} eventName - unique name of event
   * @param {Event} eventData - the import of the event
   * @param {{forward:boolean}} options - forward this event externally
   */
  async notify (eventName, eventData, options) {
    throw new Error('unimplemented abstract method')
  }

  /**
   * unsubscribe handler `callback` from event `eventName`
   * @param {string|RegExp} eventName
   * @param {eventHandler} callback
   */
  off (eventName, callback) {
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
}

/**
 *
 * @param {string} eventName
 * @param {import('./event').Event} eventData
 * @param {{from?:'worker'|'main'}} options
 * @fires eventName
 */
async function notify (eventName, eventData, options = {}) {
  const run = runHandler.bind(this)

  if (!eventData) {
    console.warn('no data to publish', eventName)
    return
  }

  // record options
  eventData._options = options

  try {
    if (handlers.has(eventName)) {
      await Promise.allSettled(
        handlers.get(eventName).map(async handler => {
          await run(eventName, eventData, handler, options)
        })
      )
    }

    await Promise.allSettled(
      [...handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) =>
          v.map(async f => await run(eventName, eventData, f, options))
        )
    )
  } catch (error) {
    handleError(notify.name, error)
  }
}

/**
 * @type {EventBroker}
 * @extends EventBroker
 */
class EventBrokerImpl extends EventBroker {
  /**
   * @override
   */
  constructor () {
    super()
    this.notify = notify.bind(this)
    this.postSubscription = x => x
  }

  onSubscription (modelName, cb) {
    this.postSubscription = subInfo => cb({ ...subInfo, modelName })
  }

  /**
   * @override
   * @param {string | RegExp} eventName
   * @param {eventHandler} handler
   * @param {brokerOptions} [options]
   */
  on (
    eventName,
    handler,
    {
      once = false,
      filter = {},
      singleton = false,
      priviledged = null,
      delay = 0,
      from = null
    } = {}
  ) {
    if (!eventName || typeof handler !== 'function') {
      console.error(EventBrokerImpl.name, 'invalid arg', eventName, handler)
      return null
    }
    const filterKeys = Object.keys(filter)
    const subscription = Event.create({ eventName })

    /** @type {eventHandler} */
    const callbackWrapper = eventData => {
      const conditions = {
        filter: {
          applies: filterKeys.length > 0,
          satisfied: data => filterKeys.every(k => filterKeys[k] === data[k])
        },
        priviledged: {
          applies: priviledged,
          satisfied: data => data._options?.priviledged === hash(priviledged)
        },
        from: {
          applies: typeof from === 'string',
          satisfied: data =>
            typeof data._options.from === 'string' &&
            data._options.from.toUpperCase() === from.toUpperCase()
        }
      }

      if (
        Object.values(conditions).every(
          condition => !condition.applies || condition.satisfied(eventData)
        )
      ) {
        if (once) this.off(eventName, callbackWrapper)
        if (delay > 0) setTimeout(handler, delay, eventData)
        else return handler(eventData)
      }
    }

    const script = {
      ...subscription,
      unsubscribe: () => this.off(eventName, callbackWrapper)
    }

    const funcs = handlers.get(eventName)
    if (funcs) {
      if (!singleton || funcs.length < 1) {
        funcs.push(callbackWrapper)

        // send to main
        this.postSubscription(subscription)
        return script
      }
      return null
    }
    handlers.set(eventName, [callbackWrapper])
    this.postSubscription(subscription)
    return script
  }

  /**
   *
   * @param {string} eventName
   * @param {()=>void} fn
   * @returns
   */
  off (eventName, fn) {
    let retval = false
    const funcs = handlers.get(eventName)
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
      [...handlers].map(([k, v]) => ({ [k]: v.map(fn => fn.toString()) })),
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
 * Create / return broker singleton instance
 * @todo handle all state same way
 */
export const EventBrokerFactory = (() => {
  let instance

  function createInstance () {
    return new EventBrokerImpl()
  }

  return Object.freeze({
    /**
     * @returns {EventBroker} singleton
     */
    getInstance: function () {
      if (!instance) {
        instance = createInstance()
      }
      return instance
    }
  })
})()

export default EventBrokerFactory

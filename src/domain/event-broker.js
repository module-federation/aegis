/**
 * typedef {import('./event').Event} Event
 * @typedef {import('.').Model} Model
 */

import Event from './event'
import hash from './util/hash'

const debug = process.env.DEBUG

/**
 * @callback eventHandler
 * @param {import('./event').Event} eventData
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} brokerOptions
 * @property {object} [filter] - the event data object must be a superset of the filter
 * @property {boolean} [priviledged] - the handler must possess the original value of a hashkey found in the event metadata
 * @property {boolean} [singleton] - the event can only have one handler (attempts to add multiple are ignored)
 * @property {number} [delay] - run the handler at least `delay` milliseconds after the event is fired
 * @property {boolean} [once] - run the handler and then unsubscribe. See code below to perform programmaticly.
 * ```js
 *  const listener = model.addListener(eventName, function (eventData) {
 *    // ...do something
 *    listener.unsubscribe()
 *  })
 * ```
 */

/** @type {Map<string | RegExp, eventHandler[]>} */
const handlers = new Map()

/**
 * @abstract
 * Event broker - universal subject of observers
 */
export class EventBroker {
  /**
   *
   * param {Map<string | RegExp, eventHandler[]>} eventHandlers
   */
  constructor () {}

  /**
   * Register callback to fire on event `eventName`
   * @param {String | RegExp} eventName
   * @param {eventHandler} handler
   * @param {brokerOptions} [options]
   */
  on (eventName, handler, options = {}) {
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

  console.assert(!debug, 'handler running', {
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

  /** @type {eventHandler} */
  await handle(eventData)
}

/**
 *
 * @param {string} eventName
 * @param {import('./event').Event} eventData
 * @param {} options
 * @fires eventName
 */
async function notify (eventName, eventData = {}, options = {}) {
  const run = runHandler.bind(this)

  // record options
  const data = {
    ...(typeof eventData !== 'object' ? { eventData } : eventData),
    _options: options
  }

  try {
    if (handlers.has(eventName)) {
      await Promise.allSettled(
        handlers.get(eventName).map(async handler => {
          await run(eventName, data, handler, options)
        })
      )
    }

    await Promise.allSettled(
      [...handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) => v.map(f => run(eventName, data, f, options)))
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
      from = 'worker',
      once = false,
      delay = 0,
      filter = {},
      singleton = false,
      priviledged = null
    } = {}
  ) {
    if (!eventName || typeof handler !== 'function') {
      console.error({
        fn: EventBrokerImpl.name,
        errmsg: 'invalid arg',
        eventName,
        handler
      })
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
            typeof data._options?.from === 'string' &&
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

    const sub = {
      ...subscription,
      unsubscribe: () => this.off(eventName, callbackWrapper)
    }

    const funcs = handlers.get(eventName)
    if (funcs) {
      if (!singleton || funcs.length < 1) {
        funcs.push(callbackWrapper)

        // send to main
        this.postSubscription(subscription)
        return sub
      }
      return null
    }
    handlers.set(eventName, [callbackWrapper])
    this.postSubscription(subscription)
    return sub
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

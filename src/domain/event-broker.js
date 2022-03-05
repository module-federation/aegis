/**
 * typedef {import('./event').Event} Event
 * @typedef {import('.').Model} Model
 */

import domainEvents from './domain-events'
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
 *  const listener = model.(eventName, function (eventData) {
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
async function runHandler (eventName, eventData = {}, handle) {
  const abort = eventData ? false : true

  console.assert(!debug, 'handler running', {
    eventName,
    eventUuid: eventData?.eventUuid,
    handle: handle.toString(),
    model: eventData?.modelName,
    modelId: eventData?.modleId
  })

  if (abort) {
    console.warn('no data provided, abort')
    return
  }

  /**
   * Git rid of unserializable types in the message
   * to avoid rejection if passed between threads
   * @type {eventHandler}
   */
  await handle(JSON.parse(JSON.stringify(eventData)))
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
  let data = eventData

  if (options) {
    data = { ...eventData, _options: { ...options } }
  }
  console.debug({ fn: notify.name, data })

  try {
    if (handlers.has(eventName)) {
      await Promise.allSettled(
        handlers.get(eventName).map(async fn => {
          await run(eventName, data, fn)
        })
      )
    }

    await Promise.allSettled(
      [...handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) => v.map(fn => run(eventName, data, fn)))
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
      from = null,
      once = false,
      delay = 0,
      filter = {},
      singleton = false,
      forwarded = false,
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
          applies: true, // have to check the data to know
          satisfied: data =>
            !data ||
            !data._options ||
            !data._options.priviledged ||
            data._options.priviledged === hash(priviledged)
        },
        from: {
          applies: typeof from === 'string',
          satisfied: data =>
            data &&
            data._options &&
            typeof data._options.from === 'string' &&
            data._options.from.toUpperCase() === from.toUpperCase()
        },
        forwarded: {
          applies: typeof forwarded === 'boolean',
          satisfied: data =>
            data &&
            data._options &&
            typeof data._options.forwarded === 'boolean' &&
            data._options.forwarded === forwarded
        }
      }

      if (
        Object.values(conditions).every(condition => {
          const ok = !condition.applies || condition.satisfied(eventData)

          console.debug({
            fn: notify.name,
            ...condition,
            satisfied: condition.satisfied.toString(),
            eventName,
            ok
          })

          return ok
        })
      ) {
        if (once) this.off(eventName, callbackWrapper)
        if (delay > 0) setTimeout(handler, delay, eventData)
        else return handler(eventData)
      } else {
        console.debug('at least one condition not satisfied', eventName)
      }
    }

    const sub = {
      ...subscription,
      unsubscribe: () => this.off(eventName, callbackWrapper)
    }

    const funcs = handlers.get(eventName)
    if (funcs) {
      if (singleton) return
      funcs.push(callbackWrapper)
      // send to main
      return sub
    }
    handlers.set(eventName, [callbackWrapper])
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
const EventBrokerFactory = (() => {
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

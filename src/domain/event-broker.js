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
 * @property {object} [filter] - the event object must be a superset of the filter
 * @property {boolean} [priviledged] - the handler must possess the original value of a hashkey found in the event metadata
 * @property {boolean} [singleton] - the event can only have one handler (attempts to add multiple are ignored)
 * @property {number} [delay] - run the handler at least `delay` milliseconds after the event is fired
 * @property {string} [origin] - if an event specifies an origin then the handler must have the same origin
 * @property {boolean} [once] - run the handler and then unsubscribe. See code below to perform programmaticly.
 * ```js
 *  const listener = model.eventName, function (eventData) {
 *    // ...do something
 *    listener.unsubscribe()
 *  })
 * ```
 * @property {function(import('./event').Event):boolean} [custom] write a custom validation function
 * @property {string[]} [ignore] a list of eventNames for which the handler will not run
 *
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
   * @type {eventHandler}
   */
  await handle(eventData)
}

/**
 *
 * @param {string} eventName
 * @param {import('./event').Event} eventData
 * @param {brokerOptions} options
 * @fires eventName
 */
async function notify (eventName, eventData = {}, options = {}) {
  const run = runHandler.bind(this)
  let data = eventData
  let match = false

  if (options) {
    data = { ...eventData, _options: { ...options } }
  }

  try {
    if (handlers.has(eventName)) {
      match = true
      await Promise.allSettled(
        handlers.get(eventName).map(async fn => {
          await run(eventName, data, fn)
        })
      )
    }

    if (options.regexOff && match) return

    await Promise.allSettled(
      [...handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) => v.map(fn => run(eventName, data, fn)))
    )
  } catch (error) {
    handleError(notify.name, error)
  }
}

const disabledEvents = []
const enabledEvents = []

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
    this.subscriptionCb = x => x
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
      delay = 0,
      filter = {},
      ignore = [],
      custom = null,
      enabled = [],
      disabled = [],
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
    disabledEvents.concat(disabled)
    enabledEvents.concat(enabled)

    // if (this.eventPort) {
    //   this.eventPort.postMessage({
    //     metaEvent: 'new_subscription',
    //     eventName,
    //     eventSource: this.eventSource
    //   })
    // }

    /** @type {eventHandler} */
    const eventCallbackWrapper = async eventData => {
      const conditions = {
        filter: {
          applies: filterKeys.length > 0,
          satisfied: event => filterKeys.every(k => filterKeys[k] === event[k])
        },
        priviledged: {
          applies: true, // have to check the data to know
          satisfied: event =>
            !event ||
            !event._options ||
            !event._options.priviledged ||
            event._options.priviledged === hash(priviledged)
        },
        ignore: {
          applies: ignore?.length > 0,
          satisfied: event => !ignore.includes(event.eventName)
        },
        custom: {
          applies: typeof custom === 'function',
          satisfied: event => custom(event)
        },
        enabled: {
          applies: enabledEvents.length > 0,
          satisfied: event => enabled.includes(event.eventName)
        },
        disabled: {
          applies: disabledEvents.length > 0,
          satisfied: event => !disabled.includes(event.eventName)
        }
      }

      if (
        Object.keys(conditions).every(key => {
          const result =
            !conditions[key].applies || conditions[key].satisfied(eventData)

          debug &&
            console.debug({
              fn: notify.name,
              condition: key,
              applies: conditions[key].applies,
              eventName,
              eventDataEventName: eventData.eventName,
              satisfied: result
            })

          return result
        })
      ) {
        if (once) this.off(eventName, eventCallbackWrapper)
        if (delay > 0) setTimeout(handler, delay, eventData)
        else handler(eventData)
      } else {
        //console.debug('at least one condition not satisfied', eventData)
      }
    }

    const sub = {
      ...subscription,
      unsubscribe: () => this.off(eventName, eventCallbackWrapper)
    }

    //console.debug([...handlers])

    const funcs = handlers.get(eventName)
    if (funcs) {
      if (singleton) return
      funcs.push(eventCallbackWrapper)
      this.subscriptionCb(eventName)
      // send to main
      return sub
    }
    handlers.set(eventName, [eventCallbackWrapper])
    this.subscriptionCb(eventName)
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

  // setEventPort(eventPort, eventSource) {
  //   this.eventPort = eventPort
  //   this.eventSource = eventSource
  // }

  onSubcribe (cb) {
    this.subscriptionCb = eventName => typeof cb === 'function' && cb(eventName)
  }

  serialize () {
    return JSON.stringify(
      [...handlers].map(([k, v]) => ({ [k]: v.map(fn => fn.toString()) })),
      null
    )
  }

  getEvents () {
    return [...handlers]
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

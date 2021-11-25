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
 * @param {Event | Model | {eventName:string, Model}} eventData
 * @returns {Promise<void>}
 */

/**
 * @typedef {object} defaultOptions
 * @property {boolean} [allowMultiple] - allow multiple handlers for this event
 * @property {boolean} [once] - run this listener only once
 * @property {string} [matchId] - run this handler only if the `uuid` provided matches the uuid
 * of the event returned by the callback
 */

/**
 * @type {defaultOptions}
 */
const defaultOptions = {
  allowMultiple: true,
  once: false,
  matchId: false
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
   * @param {{allowMultiple?:boolean, once?:boolean}} [options]
   * `allowMultiple` true by default; if false, event can be handled by only one callback
   */
  on (eventName, handler, { ...defaultOptions }) {
    throw new Error('unimplemented abstract method')
  }

  /**
   * Fire event `eventName` and pass `eventData` to listeners.
   * @param {String} eventName - unique name of event
   * @param {Event} eventData - the import of the event
   * @param {boolean} forward - forward this event externally
   */
  async notify (eventName, eventData, forward) {
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
 * @param {*} eventData
 * @param {eventHandler} handle
 * @param {boolean} forward
 */
async function runHandler (eventName, eventData = {}, handle, forward) {
  const abort = eventData ? false : true

  console.assert(!DEBUG, 'handler running', {
    eventName,
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

  const data = { ...eventData, eventName }
  await handle(data)

  if (forward && eventName !== forwardEvent) {
    await this.notify(forwardEvent, data)
  }
}

/**
 *
 * @param {string} eventName
 * @param {*} eventData
 * @param {boolean} forward
 */
async function notify (eventName, eventData, forward = false) {
  const run = runHandler.bind(this)

  if (!eventData) {
    console.warn('no data to publish', eventName)
    return
  }

  try {
    if (this.handlers.has(eventName)) {
      await Promise.allSettled(
        this.handlers.get(eventName).map(async handler => {
          await run(eventName, eventData, handler, forward)
        })
      )
    }

    await Promise.allSettled(
      [...this.handlers]
        .filter(([k]) => k instanceof RegExp && k.test(eventName))
        .map(([, v]) =>
          v.map(async f => await run(eventName, eventData, f, forward))
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
   * @param {{allowMultiple?:boolean, matchId?:boolean, once?:boolean}} [options]
   */
  on (
    eventName,
    handler,
    { once = false, matchId = false, allowMultiple = true } = {}
  ) {
    if (!eventName || typeof handler !== 'function') {
      console.error(ObserverImpl.name, 'invalid arg', eventName, handler)
      return false
    }
    const thisEvent = Event.create({ eventName })

    const callbackWrapper = eventData => {
      const conditions = {
        matchId: {
          applies: matchId,
          satisfied: event => thisEvent.eventUuid === event?.eventUuid
        },
        once: {
          applies: once,
          satisfied: event => {
            if (
              !conditions.matchId.applies ||
              conditions.matchId.satisfied(event)
            )
              this.off(eventName, callbackWrapper)
            return true
          }
        }
      }

      if (
        Object.values(conditions).every(
          condition => !condition.applies || condition.satisfied(eventData)
        )
      ) {
        return handler(eventData)
      }
    }

    const funcs = this.handlers.get(eventName)
    if (funcs) {
      if (allowMultiple || funcs.length < 1) {
        funcs.push(callbackWrapper)
        return true
      }
    } else {
      this.handlers.set(eventName, [callbackWrapper])
      return true
    }
    return false
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

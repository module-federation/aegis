/**
 * @typedef {import('./event').Event} Event
 * @typedef {import('.').Model} Model
 */

import domainEvents from './domain-events'

const { forwardEvent } = domainEvents

/**
 * @callback eventHandler
 * @param {Event | Model | {eventName:string, Model}} eventData
 * @returns {Promise<void>}
 */

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
   * @param {boolean} [allowMultiple] - true by default; if false, event can be handled by only one callback
   */
  on (eventName, handler, allowMultiple = true) {
    throw new Error('unimplemented abstract method')
  }

  /**
   * Fire event `eventName` and pass `eventData` to listeners.
   * @param {String} eventName
   * @param {Event} eventData
   */
  async notify (eventName, eventData) {
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
  const data = { ...eventData, eventName }
  await handle(data)
  forward &&
    eventName !== forwardEvent &&
    (await this.notify(forwardEvent, data))
}

/**
 *
 * @param {string} eventName
 * @param {*} eventData
 * @param {boolean} forward
 */
async function notify (eventName, eventData, forward = false) {
  const run = runHandler.bind(this)

  try {
    if (this.handlers.has(eventName)) {
      await Promise.allSettled(
        this.handlers.get(eventName).map(handler => {
          console.debug('hander running', {
            eventName,
            handler: handler.toString()
          })
          run(eventName, eventData, handler, forward)
        })
      )
    }

    await Promise.allSettled(
      [...this.handlers]
        .filter(([k, v]) => k instanceof RegExp && k.test(eventName))
        .map(([k, v]) => v.map(f => run(eventName, eventData, f, forward)))
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
   * @param {boolean} [allowMultiple]
   */
  on (eventName, handler, allowMultiple = true) {
    if (!eventName || typeof handler !== 'function') {
      console.debug(ObserverImpl.name, 'invalid arg', eventName, handler)
      return false
    }
    if (this.handlers.has(eventName)) {
      if (allowMultiple) {
        this.handlers.get(eventName).push(handler)
      }
    } else {
      this.handlers.set(eventName, [handler])
    }
    return true
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

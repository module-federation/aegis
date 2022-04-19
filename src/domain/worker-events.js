'use strict'

import { EventBrokerFactory } from '.'

const broker = EventBrokerFactory.getInstance()

const workerEvents = {
  shutdown: signal => process.exit(signal || 0),
  emitEvent: event => broker.notify(event.eventName, event)
}

/**
 *
 * @param {import('./event-broker').EventBroker} broker
 */
export function registerWorkerEvents (broker) {
  broker.on('from_main', event => {
    if (typeof workerEvents[event.eventName] !== 'function') {
      console.debug({msg: 'not a function'})
      return
    }
    console.debug({ fn: workerEvents[event.eventName].name, event })
    workerEvents[event.eventName](event)
  })
}

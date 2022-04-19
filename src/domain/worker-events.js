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
    console.debug({ fn: 'eventHandler', event })
    workerEvents[event.eventName](event)
    broker.notify('to_main', { fn: registerWorkerEvents.name, event })
  })
}

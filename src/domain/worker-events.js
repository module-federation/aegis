'use strict'

/**
 *
 * @param {import('./event-broker').EventBroker} broker
 */
export function registerWorkerEvents (broker) {
  broker.on(
    'from_main',
    event => event.eventName === 'shutdown' && process.exit(event.data || 0)
  )
  broker.on(
    'from_main',
    event =>
      event.eventName === 'emitEvent' && broker.notify(event.eventName, event)
  )
}

'use strict'

const workerEvents = {
  shutdown: signal => process.exit(signal || 0),
  emitEvent: (event, broker) => broker.notify(event.eventName, event)
}

/**
 *
 * @param {import('./event-broker').EventBroker} broker
 */
export function registerWorkerEvents (broker) {
  broker.on('from_main', async event => {
    if (typeof workerEvents[event.eventName] !== 'function') {
      console.debug({ msg: 'not a function', event })
      return
    }
    console.debug({ fn: workerEvents[event.eventName].name, event })
    const result = workerEvents[event.eventName](event, broker)
    const response = JSON.parse(
      JSON.stringify(result.then ? await result : result)
    )
    await broker.notify('to_main', {
      ...response,
      eventTarget: event.eventSource,
      eventSource: event.eventTarget
    })
  })
}

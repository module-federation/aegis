const { Worker, isMainThread, parentPort } = require('worker_threads')
const EventEmitter = require('events').EventEmitter
const broker = new EventEmitter()

/**
 * Allow listeners to subscribe to events from another thread.
 * Allow threads to send events to each other.
 */

if (isMainThread) {
  const worker = new Worker(__filename)
  broker.on('to_worker', event => worker.postMessage(event))
  broker.on('event1', event => console.log(event))
  worker.on('message', event => broker.emit(event.eventName, event.eventData))
  setTimeout(() =>
    broker.emit(
      'to_worker',
      { eventName: 'event2', eventData: { model: 2 } },
      3000
    )
  )
} else {
  parentPort.on('message', event =>
    broker.emit(event.eventName, event.eventData)
  )
  broker.on('to_main', event => parentPort.postMessage(event))
  broker.emit('to_main', { eventName: 'event1', eventData: { model: 1 } })
  broker.on('event2', event => console.log(event))
}

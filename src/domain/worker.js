'use strict'

require('regenerator-runtime')
const { domain, adapters } = require('..')
const path = require('path')
const { workerData, parentPort, BroadcastChannel } = require('worker_threads')
const remote = require(path.resolve(process.cwd(), 'dist/remoteEntry'))

const {
  importRemotes,
  makeDomain,
  AppError,
  EventBrokerFactory,
  requestContext,
} = domain

const { initCache } = adapters.controllers

/** @type {import('./event-broker').EventBroker} */
const broker = EventBrokerFactory.getInstance()
const broadcast = new BroadcastChannel(workerData.poolName)

/** @type {Promise<import('./').remoteEntry[]>} */
const remoteEntries = remote.get('./remoteEntries').then(factory => factory())

/**
 * Import and bind remote modules: i.e. models, adapters and services
 * @param {import('./').remoteEntry[]} remotes
 * @returns
 */
async function init(remotes) {
  try {
    // import federated modules; override as needed
    await importRemotes(remotes)
    // get the inbound ports for this domain
    return makeDomain(workerData.poolName)
  } catch (error) {
    console.error({ fn: init.name, error })
  }
}

/**
 * Create a subchannel between this thread and the main thread that is dedicated
 * to events, both in-process (e.g. raised by one thread and handled by another) and
 * inter-process (events from or to a remote event source or sink) . Inter-process
 * events (e.g. events from another host instance) are transmitted over the service mesh.
 *
 * Connect both ends of the channel to the thread-local {@link broker} via pub/sub events.
 * Do the same for broadcast events. By convention, broadcast events never leave the host,
 * while messages sent over the event channel are forwarded to the service mesh.
 *
 * Unlike the main channel, the event channel is not meant to return a response to the caller,
 * it just fires and forgets, relying on the underlying thread implemntation to handle execution.
 *
 * If a response is needed, call `ThreadPool.runJob` as shown below
 *
 * ```js
 * threadpool.runJob(jobName, jobData, { channel: EVENTCHANNEL })
 * ```
 *
 * @param {MessagePort} eventPort
 */
function connectSubChannels(eventPort) {
  try {
    // fire events from main
    eventPort.onmessage = ev => broker.notify(ev.data.eventName, ev.data)
    // listen for broadcasts
    broadcast.onmessage = ev => broker.notify(ev.data.eventName, ev.data)

    // forward events to main
    broker.on('to_main', ev =>
      eventPort.postMessage(JSON.parse(JSON.stringify(ev)))
    )
    // forward to any thread listening on channel `poolName`
    broker.on('broadcast', ev =>
      broadcast.postMessage(JSON.parse(JSON.stringify(ev)))
    )
  } catch (error) {
    console.error({ fn: connectSubChannels.name, error })
  }
}

remoteEntries.then(remotes => {
  init(remotes).then(domainPorts => {
    console.info('aegis worker thread running')
    // dont wait for cache to load
    initCache().load()

    // handle API requests from main
    parentPort.on('message', async msg => {
      // call a port on the specified domain model named `msg.name`
      try {
        if (msg.data?.modelName) {
          const domainPort = domainPorts[msg.data.modelName][msg.name]

          if (typeof domainPort !== 'function') {
            throw new Error(
              `no port ${msg.name} on model ${msg.data.modelName}`
            )
          }

          try {
            // set the context for this request with
            requestContext.enterWith(new Map(msg.data.context))

            // invoke an inbound port method on the domain model
            const result = await domainPort(msg.data.jobData)

            if (!result) {
              throw new Error(`no result from port ${result}`)
            }

            parentPort.postMessage(JSON.parse(JSON.stringify(result)))
          } catch (error) {
            throw error
          } finally {
            // tear down context
            requestContext.exit(x => x)
          }

          return
        }

        if (msg.eventPort instanceof MessagePort) {
          // send/recv broker events to/from main thread
          connectSubChannels(msg.eventPort)
          // no response to parent port expected
          return
        }

        throw new Error(`invalid msg ${msg}`)
      } catch (error) {
        // catch so we dont kill the thread
        console.error({ fn: 'worker', error })

        // main is expecting a response
        parentPort.postMessage(AppError(error, error.code))
      }
    })

    // tell the main thread we are ready
    parentPort.postMessage({ status: 'online' })
  })
})

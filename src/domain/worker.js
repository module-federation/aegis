'use strict'

require('regenerator-runtime')
const { domain, adapters } = require('..')
const path = require('path')
const { workerData, parentPort } = require('worker_threads')
const remote = require(path.resolve(process.cwd(), 'dist/remoteEntry'))

const {
  importRemotes,
  makeDomain,
  AppError,
  EventBrokerFactory,
  requestContext
} = domain

const { initCache } = adapters.controllers

/** @type {import('@module-federation/aegis/lib/domain/event-broker').EventBroker} */
const broker = EventBrokerFactory.getInstance()

/** @type {Promise<import('../webpack/remote-entries-type').remoteEntry[]>} */
const remoteEntries = remote.get('./remoteEntries').then(factory => factory())

/**
 * Import and bind remote modules: i.e. models, adapters and services
 * @param {import('../webpack/remote-entries-type.js').remoteEntry[]} remotes
 * @returns
 */
async function init (remotes) {
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
 * to events, both inter-thread (raised by one thread and handled by another) and
 * inter-process (remotely generated and locally handled or vice versa). Inter-process
 * events (event from another host instance) are transmitted over the service mesh.
 *
 * Connect both ends of the channel to the thread-local {@link broker} via pub & sub events.
 *
 * Unlike the main channel, the event channel is not meant to return a response to the caller.
 * If a response is needed, call `ThreadPool.run` as shown below.
 *
 * ```js
 * ThreadPool.runJob(jobName, jobData, { channel: EVENTCHANNEL })
 * ```
 *
 * @param {MessagePort} eventPort
 */
function connectEventChannel (eventPort) {
  try {
    // fire events from main
    eventPort.onmessage = msgEvent =>
      broker.notify(msgEvent.data.eventName, msgEvent.data)

    // forward events to main
    broker.on('to_main', event =>
      eventPort.postMessage(JSON.parse(JSON.stringify(event)))
    )
  } catch (error) {
    console.error({ fn: connectEventChannel.name, error })
  }
}

remoteEntries.then(remotes => {
  init(remotes).then(domainPorts => {
    console.info('aegis worker thread running')
    // dont wait for cache to load
    //initCache().load()

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
          connectEventChannel(msg.eventPort)
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
  })
})

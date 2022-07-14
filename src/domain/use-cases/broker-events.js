'use strict'

/** @module domain/brokerEvents */

import DistributedCache from '../distributed-cache'
// import EventBus from '../../services/event-bus'
//import { ServiceMeshServerPlugin as ServiceMesh } from '../../adapters'
import { BroadcastChannel, isMainThread, workerData } from 'worker_threads'
import { ThreadPool } from '../thread-pool'

import { WebSocket } from 'ws'
import { EventEmitter } from 'stream'

/** @type {BroadcastChannel}*/
let broadcastChannel

class ServiceMeshClient extends EventEmitter {
  constructor () {
    super()
    this.ws = null
  }
  connect () {
    if (this.ws) return
    this.ws = new WebSocket('wss://aegis.module-federatin.org:443')
    // this.ws.on('close', connect)
    this.ws.on('open', () =>
      this.ws.send({ hostname: 'host1', role: 'node', pid: process.pid })
    )
    this.ws.on('message', msg => this.listeners('*').forEach(cb => cb(msg)))
  }
  publish ({ eventName, eventMessage }) {
    this.connect()
    this.ws.send({ eventName, eventMessage })
  }
  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }
  close () {
    this.ws.close(4999, 'closing for reload')
    this.ws = null
  }
}

/**
 *
 * @param {*} modelName
 * @param {*} broker
 * @returns
 */
function createBroadcastChannel (modelName, broker) {
  if (broadcastChannel) return broadcastChannel
  broadcastChannel = new BroadcastChannel(modelName)
  // notify listeners
  broadcastChannel.onmessage = msgEvent =>
    broker.notify(msgEvent.data.eventName, msgEvent.data)
  return broadcastChannel
}
/** @typedef {ThreadPool} threadpool*/

/**
 * Broker events between {@link threadpool}s and remote mesh instances.
 * - an event raised by one pool may need to be processed by another
 * - an event raised by one aegis instance may need to be processed by another
 * - port event forwarding
 * - distributed object cache
 *    - crud lifecycle events
 *    - cache miss search
 * @param {import('../event-broker').EventBroker} broker
 * @param {import('../shared-memory').DataSourceFactory} datasources
 * @param {import("../model-factory").ModelFactory} models
 * @param {import("../thread-pool").ThreadPoolFactory} threadpools
 */
export default function brokerEvents (broker, datasources, models) {
  if (isMainThread) {
    const serviceMesh = new ServiceMeshClient()
    // forward all events from worker threads to the service mesh
    broker.on('from_worker', async event => serviceMesh.publish(event))
    // forward reload event to mesh
    broker.on('reload', async event => serviceMesh.close('reload'))

    // forward every event from the service mesh to the workers
    serviceMesh.subscribe('*', event => {
      console.debug({ fn: 'from mesh', event })
      broker.notify('to_worker', event)
    })

    const listLocalModels = () =>
      models
        .getModelSpecs()
        .filter(spec => !spec.isCached)
        .map(spec => spec.modelName)

    // connect to mesh and provide fn to list installed services
    serviceMesh.connect({ listServices: listLocalModels })
  } else {
    createBroadcastChannel(workerData.poolName, broker)
    // create listeners that handle events from main
    require('../domain-events').registerEvents(broker)

    // init distributed object cache
    const cache = DistributedCache({
      models,
      broker,
      datasources,
      publish: event => broker.notify('to_main', event),
      subscribe: (eventName, cb) => broker.on(eventName, cb)
    })

    cache.listen()
  }

  /**
   * This is the cluster cache sync listener - when data is
   * saved in another process, the master forwards the data to
   * all the other workers, so they can update their cache.
   */
  process.on('message', ({ cmd, id, pid, data, name }) => {
    if (cmd && id && data && process.pid !== pid) {
      if (cmd === 'saveCommand') {
        const ds = datasources.getDataSource(name)
        ds.save(id, data, false)
        return
      }

      if (cmd === 'deleteCommand') {
        const ds = datasources.getDataSource(name)
        ds.delete(id, false)
        return
      }
    }
  })
}

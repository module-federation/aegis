'use strict'

/** @module domain/brokerEvents */

import DistributedCache from '../distributed-cache'
// import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { BroadcastChannel, isMainThread, workerData } from 'worker_threads'
import { ThreadPool } from '../thread-pool'

/** @type {BroadcastChannel}*/
let broadcastChannel

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
    // forward all events from worker threads to the service mesh
    broker.on('from_worker', async event => ServiceMesh.publish(event))
    // forward reload event to mesh
    broker.on('reload', async event => ServiceMesh.close('reload'))

    // forward every event from the service mesh to the workers
    ServiceMesh.subscribe('*', event => {
      console.debug({ fn: 'from mesh', event })
      broker.notify('to_worker', event)
    })

    const listLocalModels = () =>
      models
        .getModelSpecs()
        .filter(spec => !spec.isCached)
        .map(spec => spec.modelName)

    // connect to mesh and provide fn to list installed services
    ServiceMesh.connect({ listServices: listLocalModels })
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

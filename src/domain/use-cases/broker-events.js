'use strict'

/** @module domain/brokerEvents */

import { BroadcastChannel, isMainThread, workerData } from 'worker_threads'

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

/**
 * Broker events between {@link threadpool}s and remote mesh instances.
 * - an event raised by one pool may need to be processed by another
 * - an event raised by one aegis instance may need to be processed by another
 * - port event forwarding
 * - distributed object cache
 *    - crud lifecycle events
 *    - cache miss search
 * @param {{
 *  broker:import('../event-broker').EventBroker,
 *  datasources:import('../shared-memory').DataSourceFactory,
 *  models:import("../model-factory").ModelFactory,
 *  ObjectCache:import('../distributed-cache'),
 *  ServiceMesh:import('../../adapters/service-mesh/node').ServiceMeshClient
 * }} models
 *
 */
export default function brokerEvents ({
  broker,
  datasources,
  models,
  ServiceMesh,
  ObjectCache
}) {
  if (isMainThread) {
    /**
     *
     * @param {import('../../adapters/service-mesh/node').ServiceMeshClient} serviceMesh
     */
    function initServiceMesh (serviceMesh) {
      // turn off all listeners for these events
      broker.off('reload')
      broker.off('from_worker')
      broker.off('to_worker')

      // reinitialize service mesh on reload
      broker.on('reload', async event => {
        initServiceMesh(new ServiceMesh())
      })

      // forward all events from worker threads to the service mesh
      broker.on('from_worker', async event => serviceMesh.publish(event))

      // forward all events from the mesh to worker threads
      serviceMesh.subscribe('*', event => broker.notify('to_worker', event))

      // generate a list of installed services
      const listLocalModels = () =>
        models
          .getModelSpecs()
          .filter(spec => !spec.isCached)
          .map(spec => spec.modelName)

      // connect to mesh and provide fn to list installed services
      serviceMesh.connect({ listServices: listLocalModels })
    }

    initServiceMesh(new ServiceMesh())
  } else {
    createBroadcastChannel(workerData.poolName, broker)
    // create listeners that handle events from main
    require('../domain-events').registerEvents(broker)

    // init distributed object cache
    const cache = ObjectCache({
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

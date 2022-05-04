'use strict'

/** @module domain/brokerEvents */

import DistributedCache from '../distributed-cache'
// import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { isMainThread } from 'worker_threads'

/**
 * Broker events between {@link ThreadPoolFactory} and remote mesh instances.
 * - an event raised by one pool may need to be processed by another
 * - an event raised by one aegis instance may need to be processed by another
 * - event forwarding
 * - distributed object cache
 *    - crud lifecycle events
 *    - find obj / cache miss
 * @param {import('../event-broker').EventBroker} broker
 * @param module:src/domain/threadpool-factory datasources
 * @param {import("../model-factory").ModelFactory} models
 * @param {import("../thread-pool").ThreadPoolFactory} threadpools
 */
export default function brokerEvents (
  broker,
  datasources,
  models,
  threadpools
) {
  if (isMainThread) {
    const listLocalModels = () =>
      models
        .getModelSpecs()
        .filter(spec => !spec.isCached)
        .map(spec => spec.modelName)

    // forward any event that is not handled locally to the service mesh
    broker.on('from_worker', async event => ServiceMesh.publish(event))

    // forward everything from the service mesh to the worker threads
    ServiceMesh.subscribe('*', event => {
      console.log({ fn: 'from sm', event })
      broker.notify('to_worker', event)
    })

    // connect to mesh and provide fn to list installed services
    ServiceMesh.connect({ services: listLocalModels })
  } else {
    // create listeners that handle command events from main
    require('../worker-events').registerWorkerEvents(broker)

    // init distributed object cache
    const manager = DistributedCache({
      models,
      broker,
      datasources,
      // define appropriate pub/sub functions for env
      publish: event => broker.notify('to_main', event),
      subscribe: (eventName, cb) => broker.on(eventName, cb)
    })

    manager.start()
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

'use strict'

/** @module domain/brokerEvents */

import { isMainThread } from 'worker_threads'

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
export default async function brokerEvents({
  broker,
  models,
  datasources,
  PortEventRouter,
  DistributedCache,
  createServiceMesh,
}) {
  if (isMainThread) {
    // generate a list of installed services
    const listLocalModels = () =>
      models
        .getModelSpecs()
        .filter(spec => !spec.isCached && !spec.internal)
        .map(spec => spec.modelName)

    const serviceMesh = createServiceMesh({
      listServices: listLocalModels,
    })

    // connect to broker
    serviceMesh.connect()

    // reinitialize service mesh on reload
    broker.on('reload', async () => {
      serviceMesh.close(4999, 'reload')
    })

    // forward all events from worker threads to service mesh
    broker.on('from_worker', event => serviceMesh.publish(event))

    // forward all events from service mesh to worker threads
    serviceMesh.subscribe('*', event => broker.notify('to_worker', event))
  } else {
    // create listeners that handle events from main
    require('../domain-events').registerEvents(broker)

    // init distributed object cache
    const cache = DistributedCache({
      models,
      broker,
      datasources,
      publish: event => broker.notify('to_main', event),
      subscribe: (eventName, cb) => broker.on(eventName, cb),
    })

    cache.listen()

    const router = new PortEventRouter(models, broker)

    router.listen()
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

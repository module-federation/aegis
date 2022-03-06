'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { forwardEvents } from './forward-events'
import uuid from '../util/uuid'
import { isMainThread } from 'worker_threads'

// use external event bus for distributed object cache?
const useEvtBus = process.env.EVENTBUS_ENABLE || false
// what channel to broadcast cache events?
const BROADCAST = process.env.TOPIC_BROADCAST || 'broadcastChannel'
/**
 * Broker events between threadpools and remote mesh instances.
 * - an event raised by one pool may need to be processed by another
 * - an event raised by one aegis instance may need to be processed by another
 * - event forwarding
 * - distributed object cache
 *    - crud lifecycle events
 *    - find obj / cache miss
 * @param {import('../event-broker').EventBroker} broker
 * @param {import("../datasource-factory")} datasources  n
 * @param {import("../model-factory").ModelFactory} models
 * @param {import("../thread-pool").default} threadpools
 */
export default function brokerEvents (broker, datasources, models) {
  console.debug({ fn: brokerEvents.name })

  function buildPubSubFunctions () {
    if (isMainThread) {
      // publish worker thread events to the mesh
      broker.on('EVENT_FROM_WORKER', event => ServiceMesh.publish(event))

      // forward mesh events to subscribed workers
      ServiceMesh.subscribe('EVENT_FROM_MESH', event =>
        broker.notify('EVENT_FROM_MESH', event)
      )

      if (useEvtBus) {
        return {
          publish: event => EventBus.notify(BROADCAST, JSON.stringify(event)),
          subscribe: (event, cb) =>
            EventBus.listen({
              topic: BROADCAST,
              id: uuid(),
              once: false,
              filters: [event],
              callback: msg => cb(JSON.parse(msg))
            })
        }
      }

      return {
        publish: event => ServiceMesh.publish(event),
        subscribe: (event, cb) =>
          console.log('sending to workers', event, cb.toString())
      }
    } else {
      return {
        publish: broker.notify()
      }
    }
  }

  const { publish, subscribe } = buildPubSubFunctions()

  const manager = DistributedCache({
    broker,
    datasources,
    models,
    publish,
    subscribe
  })

  const listModels = () =>
    models.getModelSpecs().map(spec => spec.modelName) || []

  // start mesh
  ServiceMesh.connect({ models: listModels, broker }).then(() => {
    console.debug('service mesh connecting')
    manager.start()
    forwardEvents({ broker, models, publish, subscribe })
  })

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

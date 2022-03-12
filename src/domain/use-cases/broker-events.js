'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { forwardEvents } from './forward-events'
import uuid from '../util/uuid'
import { isMainThread } from 'worker_threads'
import ThreadPoolFactory from '../thread-pool'

// use external event bus for distributed object cache?
const useEvtBus = /true/i.test(process.env.EVENTBUS_ENABLE) || false
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
 * @param {import("../datasource-factory")} datasources
 * @param {import("../model-factory").ModelFactory} models
 * @param {import("../thread-pool").default} threadpools
 */

export default function brokerEvents (broker, datasources, models) {
  console.debug({ fn: brokerEvents.name })

  function buildPubSubFunctions () {
    if (isMainThread) {
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
      broker.on('from_worker', event => ServiceMesh.publish(event))

      return {
        publish: event => {
          console.debug('main:publish:ServiceMesh.publish', event)
          ServiceMesh.publish(event)
          //ThreadPoolFactory.post(event)
        },
        subscribe: (eventName, cb) => {
          console.debug('main:subscribe:to_worker', eventName)
          ServiceMesh.subscribe(eventName, event => {
            broker.notify('to_worker', event)
            cb(event)
          })
        }
      }
    } else {
      return {
        publish: event => {
          console.debug('worker:to_main', event)
          broker.notify('to_main', event)
        },
        subscribe: (eventName, cb) => {
          console.debug('worker:subscribe:from_main', eventName)
          broker.on('from_main', event => cb({ ...event, eventName }))
        }
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

  if (isMainThread) {
    const listModels = () =>
      models.getModelSpecs().map(spec => spec.modelName) || []``

    // start mesh
    ServiceMesh.connect({ models: listModels, broker }).then(() => {
      console.debug('connecting to service mesh')
      manager.start()
      forwardEvents({ broker, models, publish, subscribe })
    })
  } else {
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

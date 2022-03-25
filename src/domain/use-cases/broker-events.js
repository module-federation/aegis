'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { forwardEvents } from './forward-events'
import uuid from '../util/uuid'
import { isMainThread } from 'worker_threads'
import { EventRouter } from '../event-router'

// use external event bus for distributed object cache?
const useEventBus = /true/i.test(process.env.EVENTBUS_ENABLED) || false
// what channel to broadcast cache events?
const broadcast = process.env.TOPIC_BROADCAST || 'broadcastChannel'

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
export default function brokerEvents (
  broker,
  datasources,
  models,
  threadpools
) {
  console.debug({ fn: brokerEvents.name })

  const routes = new Map()

  function buildPubSubFunctions () {
    if (isMainThread) {
      if (useEventBus) {
        return {
          publish: event => EventBus.notify(broadcast, JSON.stringify(event)),
          subscribe: (event, cb) =>
            EventBus.listen({
              topic: broadcast,
              id: uuid(),
              once: false,
              filters: [event],
              callback: msg => cb(JSON.parse(msg))
            })
        }
      }

      /**
       * Forward the event to any local thread that can handle it.
       *
       * @param {import('../event').Event} event
       * @returns {Promise<boolean>} true if routed
       */
      async function route (event) {
        try {
          if (event.metaEvent) {
            if (event.metaEvent === 'subscription') {
              if (routes.has(event.eventName))
                routes.get(event.eventName).push(event.eventSource)
              else routes.set(event.eventName, [event.eventSource])
            }
            return true
          }
          if (!routes.has(event.eventName)) return false
          routes.get(event.eventName).forEach(async eventTarget => {
            if (eventName.endsWith(eventTarget)) {
              const pool = threadpools.getThreadPool(eventTarget)

              if (pool) {
                await pool.fireEvent({ name: 'fireEvent', data: event })
                return true
              }
            }
          })
          return false
        } catch (error) {
          console.error({ fn: route.name, error })
        }
      }

      // forward everything from workers to service mesh, unless handled locally
      broker.on(
        'from_worker',
        async event => (await route(event)) || ServiceMesh.publish(event)
      )
      // forward anything from the servivce mesh to the workers
      broker.on('from_mesh', event => broker.notify('to_worker', event))

      return {
        publish: event => console.debug('no-op', event),
        subscribe: (eventName, cb) => console.log('no-op', eventName)
      }
    } else {
      return {
        publish: event => {
          console.debug('worker:to_main', event)
          broker.notify('to_main', event)
        },
        subscribe: (eventName, cb) => {
          console.debug('worker:subscribe:from_main', eventName)
          broker.on(
            'from_main',
            event => event.eventName === eventName && cb(event)
          )
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
      models.getModelSpecs().map(spec => spec.modelName) || []

    // start mesh
    ServiceMesh.connect({ models: listModels, broker })
  } else {
    manager.start()
  }

  //router = EventRouter({ models, threadpools })

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

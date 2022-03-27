'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { isMainThread, workerData } from 'worker_threads'
import domainEvents from '../domain-events'

// use external event bus for distributed object cache?
//const useEventBus = /true/i.test(process.env.EVENTBUS_ENABLED) || false
// what channel to broadcast cache events?
//const broadcast = process.env.TOPIC_BROADCAST || 'broadcastChannel'

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

  if (isMainThread) {
    const mapRoutes = () =>
      models
        .getModelSpecs()
        .filter(spec => spec.relations && !spec.isCashed)
        .flatMap(spec =>
          Object.keys(spec.relations).map(k => ({
            model: spec.modelName,
            related: spec.relations[k].modelName.toUpperCase()
          }))
        )
        .map(spec => [
          spec.model,
          [
            ...Object.keys(models.EventTypes)
              .map(type => models.getEventName(type, spec.related))
              .concat([
                ...Object.values(domainEvents).map(de =>
                  typeof de === 'function' ? de(spec.related) : de
                )
              ])
          ]
        ])
        .flatMap(([k, v]) => v.map(v => [v, k]))

    const routes = mapRoutes()

    console.debug({ routes })

    const searchEvents = eventName =>
      routes.filter(r => r[0] === eventName).map(r => r[1])

    async function sendEvent (event, poolName) {
      const pool = threadpools.getThreadPool(poolName)
      if (pool) {
        return pool.fireEvent({ name: 'emitEvent', data: event })
      } else console.error('no such pool', poolName)
    }

    /**
     * Send the event to the local target, if there is one. If not,
     * send to mesh. If the target pool is not running, start it.
     *
     * @param {import('../event').Event} event
     * @returns {Promise<boolean>} true if routed
     */
    async function route (event) {
      try {
        const eventName = event.eventName
        const isCrudEvent = /crud/i.test(eventName)
        const targets = searchEvents(eventName)

        const eventHandled = await Promise.resolve(
          targets.reduce((target, handled) => {
            return target.then(async () => {
              console.debug({ msg: 'known event', eventName, target })

              // send to any non-cached local target for this event
              const localTarget = models.getModelSpec(target)
              if (!localTarget || localTarget.isCashed) return false

              try {
                await sendEvent(event, target)
              } catch (error) {
                return false
              }

              if (isCrudEvent) {
                // send this broadcast to mesh also
                return false
              }

              // all targets handled locally: do not forward
              return true && handled
            })
          }, Promise.resolve(false))
        )

        return eventHandled
      } catch (error) {
        console.debug({ fn: route.name, error })
      }
      return false
    }

    // forward everything from workers to service mesh, unless handled locally
    broker.on(
      'from_worker',
      async event => (await route(event)) || ServiceMesh.publish(event)
    )

    // forward anything from the servivce mesh to the workers
    broker.on('from_mesh', event => broker.notify('to_worker', event))

    const listModels = () =>
      models.getModelSpecs().map(spec => spec.modelName) || []

    // start mesh
    ServiceMesh.connect({ models: listModels, broker })
  } else {
    function buildPubSubFunctions () {
      return {
        publish: event => {
          console.debug('worker:to_main', event.eventName, event.modelName)
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

    const { publish, subscribe } = buildPubSubFunctions()

    const manager = DistributedCache({
      models,
      broker,
      datasources,
      publish,
      subscribe
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

'use strict'

/** @module domain/brokerEvents */

import DistributedCache from '../distributed-cache'
// import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { isMainThread } from 'worker_threads'
import domainEvents from '../domain-events'

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
    /**
     * For each local model, find models in the relations section
     * of its spec and use them to generate the list of events .
     *
     * @returns {string[][]} [[eventName,modelName]]
     */
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
                ...Object.values(domainEvents).map(v =>
                  typeof v === 'function' ? v(spec.related) : v
                )
              ])
          ]
        ])
        .flatMap(([k, v]) => v.map(v => [v, k]))

    /**
     * Find the target models/pools with a matching event
     */
    const searchEvents = eventName =>
      mapRoutes()
        .filter(r => r[0] === eventName)
        .map(r => r[1])

    function inferEventTargets (event) {
      if (!event || !event.eventName) return []
      const targets = searchEvents(event.eventName)
      if (targets.length < 1) {
        const n = event.eventName
        const eventName = n.slice(n.lastIndexOf('_') + 1)
        return searchEvents(eventName)
      }
      return targets
    }

    const parseEventTargets = event => [event.eventTarget].flat()

    const localModels = () =>
      models
        .getModelSpecs()
        .filter(spec => !spec.isCached)
        .map(spec => spec.modelName)

    const isCrudEvent = event => /crud/i.test(event.eventName)

    const isBroadcastEvent = event => event.broadcast || isCrudEvent(event)

    const targetIsRemote = target => !localModels().includes(target)

    /**
     * Get/start the pool and fire the event in a thread
     *
     * @param {import('../event').Event} event
     * @param {string} poolName name of model/pool
     */
    async function runInPool (event, poolName) {
      console.debug({ fn: runInPool.name, poolName, event })
      try {
        const pool = threadpools.getThreadPool(poolName)
        if (pool) {
          return await pool.run('emitEvent', event)
        } else console.error('no such pool', poolName)
      } catch (error) {
        console.error({ fn: runInPool.name, error })
      }
    }

    /**
     * Send the event to local targets, if there are any.
     * If not, forward to the service mesh.
     *
     * @param {import('../event').Event} event
     * @returns {Promise<boolean>} if true don't forward
     */
    async function route (event) {
      try {
        if (event.metaEvent) return false

        // if no target specififed, deduce it from config
        const targets = event.eventTarget
          ? parseEventTargets(event)
          : inferEventTargets(event)

        if (targets.length < 1) return false

        const handled = await Promise.all(
          targets.map(async target => {
            if (targetIsRemote(target)) return false

            try {
              await runInPool(event, target)
            } catch (error) {
              return false
            }

            return true
          })
        )

        // if all targets handled locally, dont forward
        return handled.reduce((c, p) => c && p, [])
      } catch (error) {
        console.debug({ fn: route.name, error })
      }
      return false
    }

    // forward any event that is not handled locally to the service mesh
    broker.on(
      'from_worker',
      async event => (await route(event)) || ServiceMesh.publish(event)
    )

    // forward everything from the servivce mesh to the worker threads
    ServiceMesh.subscribe('*', event => broker.notify('to_worker', event))

    // connect to mesh and provide fn to list installed services
    ServiceMesh.connect({ services: localModels })
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
      subscribe: (eventName, cb) => {
        broker.on(eventName, cb)
        broker.on(
          'from_main',
          event =>
            event.eventName === eventName && broker.notify(eventName, event)
        )
      }
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

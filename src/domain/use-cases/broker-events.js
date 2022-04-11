'use strict'

import DistributedCache from '../distributed-cache'
// import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { isMainThread, workerData } from 'worker_threads'
import domainEvents from '../domain-events'

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
  if (isMainThread) {
    /**
     * For each local model, find the related models in its spec
     * and use them to generate a list of domain & crud events.
     *
     * @returns
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
                ...Object.values(domainEvents).map(de =>
                  typeof de === 'function' ? de(spec.related) : de
                )
              ])
          ]
        ])
        .flatMap(([k, v]) => v.map(v => [v, k]))

    const routes = mapRoutes()

    console.debug({ routes })
    /**
     * Find the target models/pools with a matching event
     */
    const searchEvents = eventName =>
      routes.filter(r => r[0] === eventName).map(r => r[1])

    function _inferEventTargets (event) {
      if (!event?.eventName) return []
      const targets = searchEvents(event.eventName)
      if (targets.length < 1) {
        const e = event.eventName
        const eventTarget = e.slice(e.lastIndexOf('_') + 1)
        return searchEvents(eventTarget)
      }
      return targets
    }

    function inferEventTargets (event) {
      const targets = _inferEventTargets(event)
      console.log({ fn: inferEventTargets.name, targets, event })
      return targets
    }

    const parseEventTargets = event =>
      Array.isArray(event.eventTarget) ? event.eventTarget : [event.eventTarget]

    const localModels = () => models.getModelSpecs().map(spec => spec.modelName)

    const targetIsRemote = target => !localModels().includes(target)

    /**
     * Get/start the pool and fire an event into the thread
     *
     * @param {import('../event').Event} event
     * @param {string} poolName name of model/pool
     */
    async function sendEvent (event, poolName) {
      const pool = threadpools.getThreadPool(poolName)
      if (pool) {
        return pool.run('emitEvent', event)
      } else console.error('no such pool', poolName)
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
        if (event.metaEvent) return true // don't forward these

        // if no target specififed, deduce it from config
        const targets = event.eventTarget
          ? parseEventTargets(event)
          : inferEventTargets(event)

        if (targets.length < 1) return false

        const handled = await Promise.all(
          targets.map(async target => {
            console.debug({
              msg: 'known event',
              eventName: event.eventName,
              target
            })

            if (targetIsRemote(target)) return false

            try {
              await sendEvent(event, target)
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

    function enrichEvent (event) {
      if (event.modelId)
        return {
          ...event,
          model: datasources.getDataSource(event.modelName).find(event.modelId)
        }
    }

    // forward everything from workers to service mesh, unless handled locally
    broker.on('from_worker', async event => {
      //DataSourceFactory.getDataSource(event.eventSource).save
      ;(await route(event)) || ServiceMesh.publish(event)
    })

    // forward anything from the servivce mesh to the workers
    broker.on('from_mesh', event => broker.notify('to_worker', event))

    // connect to the service mesh
    ServiceMesh.connect({ models, broker })
  } else {
    function buildPubSubFunctions () {
      return {
        publish: event => {
          console.debug({
            msg: 'worker: send to main',
            eventName: event.eventName
          })
          broker.notify('to_main', event)
        },

        subscribe: (eventName, cb) => {
          console.debug('worker: subscribed to main', eventName)

          broker.on('from_main', event => {
            if (event.eventName === eventName) {
              console.debug({
                msg: 'worker: received from main',
                eventName: event.eventName,
                event
              })
              cb(event)
            }
          })
        }
      }
    }

    const { publish, subscribe } = buildPubSubFunctions()

    // start distributed object cache
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

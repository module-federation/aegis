'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { isMainThread, workerData } from 'worker_threads'

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
    const mapRelations = () =>
      models
        .getModelSpecs()
        .filter(spec => spec.relations)
        .map(spec =>
          Object.keys(spec.relations).map(k => ({
            model: spec.modelName,
            related: spec.relations[k].modelName.toUpperCase()
          }))
        )
        .flat()

    const relations = mapRelations()

    console.debug({ relations })

    const mapRelatedEvents = () =>
      relations
        .map(rel => [
          [
            rel.related,
            [
              ...Object.keys(models.EventTypes).map(type =>
                models.getEventName(type, rel.model)
              )
            ]
          ]
        ])
        .flat()

    console.debug(mapRelatedEvents())

    const mapRoutes = () =>
      mapRelatedEvents()
        .map(([k, v]) => v.map(v => [v, k]))
        .flat()

    const routes = mapRoutes()

    console.debug({ routes })

    const searchEvents = eventName => routes.filter(r => r[0] === eventName)

    const searchTargets = eventTarget =>
      routes.filter(r => r[1] === eventTarget)

    const saveRoute = (eventName, modelName) =>
      routes.concat([eventName, modelName])

    async function sendEvent (event, poolName) {
      try {
        return await threadpools
          .getThreadPool(poolName)
          .run('handleEvent', JSON.parse(JSON.stringify(event)))
      } catch (error) {
        console.error({ fn: sendEvent.name, error })
      }
    }

    /**
     * Forward the event to any local thread that can handle it.
     * If the target pool is not running, start it.
     *
     * @param {import('../event').Event} event
     * @returns {Promise<boolean>} true if routed
     */
    async function route (event) {
      try {
        const metaEvent = event.metaEvent
        const eventName = event.eventName
        const modelName = event.modelName

        if (metaEvent) {
          if (metaEvent === 'subscription') saveRoute(eventName, modelName)
          return true
        }

        const targets = searchEvents(eventName)
        if (targets.length < 1) {
          console.debug({
            fn: route.name,
            msg: 'unknown event ' + eventName
          })

          if (/request/i.test(eventName)) {
            const eventTarget = eventName.slice(eventName.lastIndexOf('_') + 1)
            const requestEvents = searchTargets(eventTarget)

            if (requestEvents.length > 0) {
              saveRoute(eventName, eventTarget)
              await sendEvent(event, eventTarget)
              return true
            }
          }

          return false
        }

        let found = false
        targets.forEach(async target => {
          // don't send back to the senderd
          const isResponse = /response/i.test(eventName)
          const isResTarget = modelName === target
          const isCrudEvent = /crud/i.test(eventName)

          console.debug('known event', eventName)

          if (isResponse && isResTarget) {
            await sendEvent(event, modelName)
            found = true
            return // only one target: the requester
          }

          if (isCrudEvent && !isResTarget) {
            await sendEvent(event, target)
            found = true
          }
        })
        return found
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

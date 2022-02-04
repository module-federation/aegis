'use strict'

import DistributedCache from '../distributed-cache'
import EventBus from '../../services/event-bus'
import { ServiceMeshAdapter as ServiceMesh } from '../../adapters'
import { BroadcastChannel, isMainThread } from 'worker_threads'
import { forwardEvents } from './forward-events'
import uuid from '../util/uuid'

// use external event bus for distributed object cache?
const useEvtBus = process.env.EVENTBUS_ENABLE || false
// what channel to broadcast cache events?
const BROADCAST = process.env.TOPIC_BROADCAST || 'broadcastChannel'
const worker = new BroadcastChannel('workers')

/**
 * Broker events between local and remote domains.
 * - event forwarding
 * - distributed object cache
 *    - crud lifecycle events
 *    - find obj / cache miss
 * @param {import('../event-broker').EventBroker} broker
 * @param {import("../datasource-factory")} datasources
 * @param {import("../model-factory").ModelFactory} models
 */
export default function brokerEvents (broker, datasources, models) {
  if (isMainThread) {
    console.debug({ fn: brokerEvents.name })
    worker.onmessage = eventData => {
      console.debug({ fn: worker.onmessage.name, eventData })
      broker.notify(eventData.eventName, eventData)
    }
    const svcMshPub = event => ServiceMesh.publish(event)
    const svcMshSub = (event, cb) => ServiceMesh.subscribe(event, cb)

    const evtBusPub = event => EventBus.notify(BROADCAST, JSON.stringify(event))
    const evtBusSub = (event, cb) =>
      EventBus.listen({
        topic: BROADCAST,
        id: uuid(),
        once: false,
        filters: [event],
        callback: msg => cb(JSON.parse(msg))
      })

    const publish = useEvtBus ? evtBusPub : svcMshPub
    const subscribe = useEvtBus ? evtBusSub : svcMshSub

    const manager = DistributedCache({
      broker,
      datasources,
      models,
      publish,
      subscribe
    })

    // start mesh regardless
    ServiceMesh.connect({ models, broker }).then(() => {
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
  } else {
    broker.on(/.*/, eventData => {
      console.debug({ fn: broker.on.name, eventData })
      worker.postMessage(eventData)
    })
  }
}

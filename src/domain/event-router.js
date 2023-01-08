'use strict'

import { workerData, BroadcastChannel } from 'worker_threads'
import domainEvents from './domain-events'
const { portEvent } = domainEvents

/**
 * Port events controls event-driven, distributed workflow and
 * inter-process communcation between co-located and remote models.
 */
export class PortEventRouter {
  /**
   *
   * @param {import('./model-factory'.ModelFactory} models
   * @param {import('./event-broker').EventBroker} broker
   */
  constructor (models, broker) {
    this.models = models
    this.broker = broker
    this._localSpec = this.models.getModelSpec(workerData.poolName)
    if (!this._localSpec)
      this.models.getModelSpecs().find(i => i.domain === workerData.poolName)
    this._threadRemotePorts = this.threadRemotePorts()
    this._threadLocalPorts = this.threadLocalPorts()
  }

  get localSpec () {
    return this._localSpec // poolName is a domain
  }

  threadLocalPorts () {
    return (
      this.models
        .getModelSpecs()
        .filter(
          spec =>
            spec.ports &&
            (spec.domain === this.localSpec.domain ||
              spec.modelName === this.localSpec.modelName)
        )
        .flatMap(spec =>
          Object.values(spec.ports)
            .filter(port => port.consumesEvent || port.producesEvent)
            .map(port => ({
              ...port,
              modelName: spec.modelName,
              domain: spec.domain
            }))
        ) || []
    )
  }

  threadRemotePorts () {
    return (
      this.models
        .getModelSpecs()
        .filter(
          spec =>
            spec.ports &&
            this._threadLocalPorts &&
            !this._threadLocalPorts.find(l => l.modelName === spec.modelName)
        )
        .flatMap(spec =>
          Object.values(spec.ports)
            .filter(port => port.consumesEvent || port.producesEvent)
            .map(port => ({
              ...port,
              modelName: spec.modelName,
              domain: spec.domain
            }))
        ) || []
    )
  }

  publisherPorts () {
    return (
      this._threadRemotePorts.filter(remote =>
        this._threadLocalPorts.find(
          local => local.producesEvent === remote.consumesEvent
        )
      ) || []
    )
  }

  subscriberPorts () {
    return (
      this._threadRemotePorts.filter(remote =>
        this._threadLocalPorts.find(
          local => local.consumesEvent === remote.producesEvent
        )
      ) || []
    )
  }

  unhandledPorts () {
    return (
      this._threadLocalPorts.filter(
        local =>
          !this._threadRemotePorts.find(
            remote => local.producesEvent === remote.consumesEvent
          ) &&
          !this._threadLocalPorts.find(
            l => local.producesEvent === l.consumesEvent
          )
      ) || []
    )
  }

  handleBroadcastEvent (msg) {
    if (msg?.data?.eventName)
      this.broker.notify(this.internalizeEvent(msg.data.eventName), msg.data)
    else {
      console.log('missing eventName', msg.data)
      this.broker.notify('missingEventName', msg.data)
    }
  }

  externalizeEvent (event) {
    if (typeof event === 'object') {
      return {
        ...event,
        eventName: portEvent(event.eventName)
      }
    }
    if (typeof event === 'string') return portEvent(event)
  }

  internalizeEvent (event) {
    if (typeof event === 'object') {
      return {
        ...event,
        eventName: event.eventName.replace(portEvent(), '')
      }
    }
    if (typeof event === 'string') return event.replace(portEvent(), '')
  }

  /**
   * Listen for producer events coming from other thread pools and
   * fire the events in the local pool for ports to consume them.
   * If a producer event is not consumed by any local pool, foward
   * it to the service mesh. Listen for local producer events and
   * dispatch them to pools that consume them.
   */
  listen () {
    const services = new Set()
    const channels = new Map()
    const subscriberPorts = this.subscriberPorts()
    const publisherPorts = this.publisherPorts()
    const unhandledPorts = this.unhandledPorts()

    publisherPorts.forEach(port => services.add(port.domain))
    subscriberPorts.forEach(port => services.add(port.domain))

    services.forEach(service =>
      channels.set(service, new BroadcastChannel(service))
    )

    console.log('publisherPorts', publisherPorts)
    console.log('subscriberPorts', subscriberPorts)
    console.log('unhandledPorts', unhandledPorts)
    console.log('channels', channels)

    // listen for producer events and dispatch them to local pools
    publisherPorts.forEach(port =>
      this.broker.on(port.producesEvent, event =>
        channels
          .get(port.domain)
          .postMessage(JSON.parse(JSON.stringify(this.externalizeEvent(event))))
      )
    )

    // listen for incoming consumer events from local pools
    subscriberPorts.forEach(port => {
      channels.get(port.domain).onmessage = msg =>
        this.handleBroadcastEvent(msg)
    })

    // dispatch events not handled by local pools to the service mesh
    unhandledPorts.forEach(port => {
      this.broker.on(port.producesEvent, event => {
        this.broker.notify('to_main', {
          ...event,
          eventName: this.externalizeEvent(port.producesEvent),
          route: 'balanceEventConsumer' // mesh routing algo
        })
      })
    })

    if (!channels.has(this.localSpec.domain)) {
      // listen to this model's channel
      new BroadcastChannel(this.localSpec.domain).onmessage = msg => {
        console.log('onmessage', msg.data)
        this.handleBroadcastEvent(msg)
      }
    }
  }
}

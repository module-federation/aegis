'use strict'

import { workerData } from 'worker_threads'
import domainEvents from './domain-events'

const { portEvent } = domainEvents

/**
 * Port events control event-driven, distributed workflow and
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
      this.models.getModelSpecs().find(s => s.domain === workerData.poolName)
      
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

  externalizeEvent (event, route = 'broadcast') {
    if (typeof event === 'object') {
      return {
        ...event,
        eventName: portEvent(event.eventName),
        route
      }
    }
    if (typeof event === 'string') return portEvent(event)
  }

  /**
   * Listen for producer events coming from other thread pools and
   * fire the events in the local pool for ports to consume them.
   * If a producer event is not consumed by any local pool, foward
   * it to the service mesh. Listen for local producer events and
   * dispatch them to pools that consume them.
   */
  listen () {
    const subscriberPorts = this.subscriberPorts()
    const publisherPorts = this.publisherPorts()
    const unhandledPorts = this.unhandledPorts()

    console.log('publisherPorts', publisherPorts)
    console.log('subscriberPorts', subscriberPorts)
    console.log('unhandledPorts', unhandledPorts)

    // listen for producer events and dispatch them to local pools
    publisherPorts.forEach(port =>
      this.broker.on(port.producesEvent, event =>
        this.broker.notify('broadcast', this.externalizeEvent(event))
      )
    )

    // listen for incoming consumer events from local pools
    subscriberPorts.forEach(port =>
      this.broker.on(this.externalizeEvent(port.consumesEvent), event =>
        this.notify(port.consumesEvent, event)
      )
    )

    // dispatch events not handled by local pools to the service mesh
    unhandledPorts.forEach(port =>
      this.broker.on(port.producesEvent, event =>
        this.broker.notify('to_main', this.externalizeEvent(event))
      )
    )
  }
}

'use strict'

import { workerData, BroadcastChannel } from 'worker_threads'

export class PortEventRouter {
  constructor (models, broker) {
    this.models = models
    this.broker = broker
  }

  get localSpec () {
    if (this.__localSpec) return this.__localSpec
    this.__localSpec = this.models.getModelSpec(workerData.poolName)
    return this.__localSpec
  }

  get threadLocalPorts () {
    if (this.__threadLocalPorts) return this.__threadLocalPorts
    this.__threadLocalPorts = this.models
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
      )
    return this.__threadLocalPorts
  }

  get threadRemotePorts () {
    if (this.__threadRemotePorts) return this.__threadRemotePorts
    this.__threadRemotePorts = this.models
      .getModelSpecs()
      .filter(
        spec =>
          spec.ports &&
          !this.threadLocalPorts.find(l => l.modelName === spec.modelName)
      )
      .flatMap(spec =>
        Object.values(spec.ports)
          .filter(port => port.consumesEvent || port.producesEvent)
          .map(port => ({
            ...port,
            modelName: spec.modelName,
            domain: spec.domain
          }))
      )
    return this.__threadRemotePorts
  }

  get publisherPorts () {
    if (this.__publisherPorts) this.__publisherPorts
    this.__publisherPorts = this.threadRemotePorts.filter(remote =>
      this.threadLocalPorts.find(
        local => local.producesEvent === remote.consumesEvent
      )
    )
    return this.__publisherPorts
  }

  get subscriberPorts () {
    if (this.__subscriberPorts) return this.__subscriberPorts
    this.__subscriberPorts = this.threadRemotePorts.filter(remote =>
      this.threadLocalPorts.find(
        local => local.consumesEvent === remote.producesEvent
      )
    )
    return this.__subscriberPorts
  }

  get unhandledPorts () {
    if (this.__unhandledPorts) return this.__unhandledPorts
    this.__unhandledPorts = this.threadLocalPorts.filter(
      local =>
        !this.threadRemotePorts.find(
          remote => local.producesEvent === remote.consumesEvent
        ) && !this.localPorts.find(l => local.producesEvent === l.consumesEvent)
    )
    return this.__unhandledPorts
  }

  handleBroadcastEvent (msg) {
    if (msg?.data?.eventName) this.broker.notify(msg.data.eventName, msg.data)
    else {
      console.log('missing eventName', msg.data)
      this.broker.notify('missingEventName', msg.data)
    }
  }

  /**
   * Listen for producer events from other thread pools and invoke
   * local ports that consume them. Listen for local producer events
   * and forward to pools that consume them. If a producer event is
   * not consumed by any local thread, foward to the service mesh.
   */
  listen () {
    const services = new Set()
    const channels = new Map()

    this.publisherPorts.forEach(port => services.add(port.modelName))
    this.subscriberPorts.forEach(port => services.add(port.modelName))

    services.forEach(service =>
      channels.set(service, new BroadcastChannel(service))
    )

    console.log('publisherPorts', this.publisherPorts)
    console.log('subscriberPorts', this.subscriberPorts)
    console.log('unhandledPorts', this.unhandledPorts)
    console.log('channels', channels)

    // dispatch outgoing events to local pools
    this.publisherPorts.forEach(port =>
      this.broker.on(port.consumesEvent, event => {
        console.log('broadcasting...', { port, event })
        channels
          .get(port.modelName)
          .postMessage(JSON.parse(JSON.stringify(event)))
      })
    )

    // listen for incoming events from local pools
    this.subscriberPorts.forEach(port => {
      channels.get(port.modelName).onmessage = msg => {
        console.log('subscribePorts.onmessage', msg.data)
        this.handleBroadcastEvent(msg)
      }
    })

    // send ports not handled by local pool to mesh
    this.unhandledPorts.forEach(port => {
      this.broker.on(port.producesEvent, event => {
        this.broker.notify('to_main', {
          ...event,
          route: 'balanceEventConsumer' // mesh routing algo
        })
      })
    })

    // listen to this model's channel
    new BroadcastChannel(workerData.poolName).onmessage = msg => {
      console.log('onmessage', msg.data)
      this.handleBroadcastEvent(msg)
    }
  }
}

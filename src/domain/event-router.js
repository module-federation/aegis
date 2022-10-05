import { workerData, BroadcastChannel } from 'worker_threads'

export class PortEventRouter {
  constructor (models, broker) {
    this.models = models
    this.broker = broker
  }

  getThreadLocalPorts () {
    const spec = this.models.getModelSpec(workerData.poolName)
    return Object.values(spec.ports)
      .filter(port => port.consumesEvent || port.producesEvent)
      .map(port => ({
        ...port,
        modelName: workerData.poolName
      }))
  }

  getThreadRemotePorts () {
    return this.models
      .getModelSpecs()
      .filter(spec => spec.ports && spec.modelName !== workerData.poolName)
      .map(spec =>
        Object.values(spec.ports)
          .filter(port => port.consumesEvent || port.producesEvent)
          .map(port => ({
            ...port,
            modelName: spec.modelName
          }))
      )
      .flat()
  }

  listen () {
    const local = this.getThreadLocalPorts()
    const remote = this.getThreadRemotePorts()

    const remoteConsumers = remote.filter(r =>
      local.find(l => l.producesEvent === r.consumesEvent)
    )
    const remoteProducers = local.filter(l =>
      remote.find(r => r.producesEvent === l.consumesEvent)
    )
    // const remoteHostConsumers = remote.filter(r =>
    //   local.find(l => l.producesEvent !== r.consumesEvent)
    // )

    const services = new Set()
    const channels = new Map()

    remoteConsumers.forEach(c => {
      if (c.modelName) services.add(c.modelName)
    })
    remoteProducers.forEach(c => {
      if (c.modelName) services.add(c.modelName)
    })
    services.forEach(service =>
      channels.set(service, new BroadcastChannel(service))
    )

    console.log('remoteConsumers', remoteConsumers)
    console.log('remoteProducers', remoteProducers)
    console.log('channels', channels)

    remoteConsumers.forEach(c =>
      this.broker.on('galacticSignalBroadcasting', event => {
        console.log('broadcasting', { c })
        channels.get(c.modelName).postMessage(JSON.parse(JSON.stringify(event)))
      })
    )

    remoteProducers.forEach(
      p =>
        (p.onmessage = msg => this.broker.notify(msg.data.eventName, msg.data))
    )

    // remoteHostConsumers.forEach(c =>
    //   this.broker.on(c.producesEvent, event =>
    //     this.broker.notify('to_main', event)
    //   )
    // )
  }
}

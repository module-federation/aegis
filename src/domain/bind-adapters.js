'use strict'

function DefaultInboundAdapter (port) {
  return async function ({ model, args: [input] }) {
    return port.apply(model, input)
  }
}

/**
 * In a hex arch, ports and adapters control I/O between
 * the application core (domain) and the outside world.
 * This function calls adapter factory functions, injecting
 * any service dependencies. Using module federation,
 * adapters and services are overridden at runtime to rewire
 * ports to their actual service entry points.
 * @param {import('.').ports} ports - domain interfaces
 * @param {{[x:string]:function(*):function(*):any}} adapters - service adapters
 * @param {*} [services] - (micro-)services
 */
export default function bindAdapters ({
  ports,
  adapters,
  services,
  portSpec
} = {}) {
  if (!portSpec || !adapters) {
    return
  }

  const bindings = {
    outbound: (portName, port, adapter, service) => ({
      [portName]: adapter(service)
    }),
    inbound: (portName, port, adapter = DefaultInboundAdapter, service) => ({
      [portName]: adapter(port)
    })
  }

  return Object.keys(portSpec)
    .map(portName => {
      try {
        const adapter = adapters[portName]
        const service = services[portSpec[portName].service]
        const port = ports[portName]

        return bindings[portSpec[portName].type](
          portName,
          port,
          adapter,
          service
        )
      } catch (error) {
        console.warn({
          fn: bindAdapters.name,
          error,
          spec: portSpec[portName]
        })
      }
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

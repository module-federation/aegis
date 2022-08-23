'use strict'

function DefaultInboundAdapter (port) {
  return async function ({ model, args }) {
    console.log('received args', args)
    return port.apply(model, args)
  }
}

/**
 * In a hex arch, ports and adapters control I/O between
 * the application core (domain) and the outside world.
 * Either a port invokes an outbound adapter or it is invoked
 * by an inbound one. This function calls adapter factory
 * functions to inject each adapter with its port or service
 * dependency. It can be called at any time to support live
 * production updates. It returns an object containing the
 * set of port functions defined for the domain model in the
 * model spec. These functions are inoked by a universal port
 * function that handles error recovery, instrumentation,
 * authorization, flow control and other port features.
 *
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
        const spec = portSpec[portName]
        const type = spec.type
        const port = ports[portName]
        const adapter = adapters[portName]
        const service = services[spec.service]

        if (!adapter && type === 'outbound') {
          console.warn('no adapter for port', portName, spec)
          return
        }

        return bindings[type](portName, port, adapter, service)
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

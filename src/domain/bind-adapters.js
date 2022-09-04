'use strict'

const debug = /true/i.test(process.env.DEBUG)

function DefaultInboundAdapter (port) {
  return async function ({ model, args }) {
    return port.apply(model, args)
  }
}

/**
 * In a hex arch, ports and adapters control I/O between
 * the application core and the outside world. Inbound
 * adapters invoke ports and ports invoke outbound adapters.
 * Optionally, outbound adapters invoke services.
 *
 * To set the above each adapter's factory function
 * to inject its port or service dependency--I.e. to bind
 * it to a port or service.
 *
 * It returns an object containing the set of port functions
 * defined in the model spec for the domain model. These functions
 * are invoked by a  port function, which handles error recovery,
 * instrumentation, authorization, flow control and other port features.
 *
 * @param {{
 *  portSpec:import('.').ports
 *  ports:{[x:string]:function()}
 *  adapters:{[x:string]:function()}
 *  services:{[x:string]:function()}
 * }}
 *
 */
export default function bindAdapters ({
  ports,
  adapters,
  services,
  portSpec
} = {}) {
  if (!portSpec || !adapters || !ports) {
    debug && console.debug('missing params')
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
      const spec = portSpec[portName]
      const type = spec?.type ? spec.type : null
      const port = ports[portName]
      const adapter = adapters[portName]
      const service = services && spec.service ? services[spec.service] : null

      if (!spec || !type || !port || !adapter) {
        debug && console.debug('bad port configuration', portName, spec)
        return
      }

      return bindings[type](portName, port, adapter, service)
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

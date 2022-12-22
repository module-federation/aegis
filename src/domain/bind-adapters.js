'use strict'

import ModelFactory from './model-factory'

const debug = /true/i.test(process.env.DEBUG)

function DefaultInboundAdapter (port) {
  return async function ({ model, args }) {
    return port.apply(model, args)
  }
}

/**
 * In a hex arch, ports and adapters control I/O between
 * the application core and the outside world. Ports are
 * associated with one or more adapters. An Adapter either
 * calls a port or is called by one. In the former case,
 * we say the adpater is inbound, driving or primary;
 * in the second outbound, driven, or secondary. Inbound
 * adpaters call ports on the domain model. Outbound adapters
 * optionally call service adapaters, or just services.
 *
 * Inject each adapter with its port or service dependency--
 * i.e. bind it to a port or service, as indicated in the
 * model spec.
 *
 * Return an object containing the set of port functions for
 * each model. These port functions are called by common logic
 * that handles error recovery, instrumentation, authorization,
 * flow control, state (enabled or disabled) and other universal
 * port features.
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
  if (!portSpec || (!adapters && !ports)) {
    debug && console.debug('missing params')
    return {}
  }

  const bindings = {
    outbound: (portName, port, adapter, service) => ({
      [portName]: adapter(service)
    }),

    inbound: (portName, port, adapter = DefaultInboundAdapter, service) => ({
      [portName]: adapter(port)
    })
  }

  function badPortConfig ({ spec, type, port, adapter }) {
    return (
      !spec ||
      !type ||
      (!port && type === 'inbound') ||
      (!adapter && type === 'outbound')
    )
  }

  return Object.keys(portSpec)
    .map(portName => {
      const spec = portSpec[portName]
      const type = spec?.type ? spec.type : null
      const port = ports[portName]
      const adapter = adapters[portName]
      const service = services && spec.service ? services[spec.service] : null

      if (badPortConfig({ spec, type, port, adapter })) {
        console.warn('bad port configuration', portName, spec)
        return
      }

      return bindings[type](portName, port, adapter, service)
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

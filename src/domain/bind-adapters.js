'use strict'

/**
 * In a hex arch, ports and adapters control I/O between
 * the application core (domain) and the outside world.
 * This function calls adapter factory functions, injecting
 * any service dependencies. Using module federation,
 * adapters and services are overridden at runtime to rewire
 * ports to their actual service entry points.
 * @param {port} ports - domain interfaces
 * @param {{[x:string]:function(*):function(*):any}} adapters - service adapters
 * @param {*} [services] - (micro-)services
 */
export default function bindAdapters ({
  portConf,
  adapters,
  services,
  ports
} = {}) {
  if (!portConf || !adapters) {
    return
  }

  return Object.keys(portConf)
    .map(port => {
      try {
        const iface = adapters[port] || ports[port]
        const service = services[portConf[port].service]
        if (iface) {
          console.debug({
            port,
            adapter: adapters[port],
            portFns: ports[port],
            service
          })
          return {
            [port]: iface(service)
          }
        }
      } catch (e) {
        console.warn(e.message)
      }
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

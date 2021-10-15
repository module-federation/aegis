/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
'use strict'

const WebSocket = require('ws')
const dns = require('dns/promises')
const { default: domainEvents } = require('../../domain/domain-events')

const SERVICE_NAME = 'appmesh'
const SERVICE_HOST = 'switch.app-mesh.net'

let fqdn = process.env.WEBSWITCH_SERVER || SERVICE_HOST
let port = process.env.WEBSWITCH_PORT || SERVICE_NAME
let heartbeat = process.env.WEBSWITCH_HEARTBEAT || 10000
let hostAddress
let servicePort
let uplinkCallback
/** @type import("ws/lib/websocket") */
let ws
let timerId

async function dnsResolve (hostname) {
  try {
    const addresses = await dns.resolve(hostname, 'CNAME')
    if (addresses.length > 0) return addresses[0]
  } catch (e) {
    console.warn(dnsResolve.name, 'warning', e)
  }
  // try local override /etc/hosts
  const record = await dns.lookup(hostname)
  return record.address
}

async function getHostAddress (hostname) {
  try {
    const address = await dnsResolve(hostname)
    console.info('resolved host address', address)
    return address
  } catch (error) {
    console.warn(getHostAddress.name, error)
  }
}

async function getServicePort (hostname) {
  try {
    if (port === SERVICE_NAME) {
      const services = await dns.resolveSrv(hostname)
      return services.filter(s => s.name === SERVICE_NAME).reduce(s => s.port)
    }
  } catch (error) {
    console.error(getServicePort.name, error)
    // should default to 80
    port = /true/.test(process.env.SSL_ENABLED)
      ? process.env.SSL_PORT || 443
      : process.env.PORT || 80
    return port
  }
  return port
}

/**
 * Set callback for uplink.
 * @param {*} callback
 */
exports.onMessage = function (callback) {
  uplinkCallback = callback
}

/** server sets uplink host */
exports.setDestinationHost = function (host, servicePort = port) {
  hostAddress = null
  fqdn = host
  port = servicePort
}

exports.resetHost = function () {
  hostAddress = null
}

const protocol = () =>
  JSON.stringify({
    proto: 'webswitch',
    role: 'node',
    pid: process.pid
  })

/**
 * Call this method to broadcast a message on the appmesh network
 * @param {*} event
 * @param {import('../../domain/observer').Observer} observer
 * @param {*} networkMiddlewareAdapter
 * @returns
 */
exports.publishEvent = async function (event, observer) {
  if (!event) return
  if (!hostAddress) hostAddress = await getHostAddress(fqdn)
  if (!servicePort) servicePort = await getServicePort(fqdn)

  function publish () {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${servicePort}`)

      setInterval(() => ws.ping(), heartbeat)

      ws.addListener('pong', function () {
        console.debug('received pong, clearing timer')
        clearTimeout(timerId)
        
        timerId = setTimeout(function () {
          observer.notify(
            domainEvents.webswithTimeout(),
            'webswitch timeout',
            true
          )
          console.error('cannot contact webswitch server')
        }, heartbeat + heartbeat / 8)
      })

      ws.on('message', async function (message) {
        const eventData = JSON.parse(message)
        console.debug('received event:', eventData)

        if (eventData.eventName) {
          await observer.notify(eventData.eventName, eventData)
        }

        if (eventData.proto === 'webswitch' && eventData.pid) {
          ws.send(protocol())
          return
        }

        if (uplinkCallback) uplinkCallback(message)
      })

      ws.on('open', function () {
        ws.send(protocol())
        ws.ping(0x9)
      })

      ws.on('error', function (error) {
        console.error(ws.on, error)
      })

      return
    }

    function send () {
      if (ws.readyState) {
        ws.send(JSON.stringify(event))
        return
      }
      setTimeout(send, 1000)
    }

    send()
  }

  try {
    publish()
  } catch (e) {
    console.warn('publishEvent', e)
  }
}

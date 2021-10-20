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
const DEBUG = /true|yes|y/i.test(process.env.WEBSWITCH_DEBUG)

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
      if (services) {
        const prt = services
          .filter(s => s.name === SERVICE_NAME)
          .reduce(s => s.port)
        if (prt) {
          return prt
        }
      }
      throw new Error('cant find port')
    }
  } catch (error) {
    console.error(getServicePort.name, error)
    // should default to 80
    return /true/.test(process.env.SSL_ENABLED)
      ? process.env.SSL_PORT || 443
      : process.env.PORT || 80
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
exports.setDestinationHost = function (host) {
  hostAddress = null
  const [hst, prt] = host.split(':')
  fqdn = hst
  port = prt
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

exports.subscribe = function (eventName, callback, observer) {
  observer.on(eventName, callback)
}

/**
 * Call this method to broadcast a message on the appmesh network
 * @param {*} event
 * @param {import('../../domain/observer').Observer} observer
 * @returns
 */
exports.publish = async function (event, observer) {
  if (!event) return
  if (!hostAddress) hostAddress = await getHostAddress(fqdn)
  if (!servicePort) servicePort = await getServicePort(fqdn)

  function sendEvent () {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${servicePort}`)

      ws.addListener('pong', function () {
        !DEBUG || console.debug('received pong')
        clearTimeout(timerId)

        timerId = setTimeout(() => {
          observer.notify(
            domainEvents.webswitchTimeout(),
            'webswitch server timeout',
            true
          )
          console.error('webswitch server timed out')
        }, heartbeat + heartbeat / 8)
      })

      ws.on('message', async function (message) {
        const eventData = JSON.parse(message)
        !DEBUG || console.debug('received event:', eventData)

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
        setInterval(() => ws.ping(0x9), heartbeat)
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
    sendEvent()
  } catch (e) {
    console.warn('publish', e)
  }
}

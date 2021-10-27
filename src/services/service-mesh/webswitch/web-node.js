/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
'use strict'

import WebSocket from 'ws'
import dns from 'dns/promises'
import path from 'path'

const SERVICE_NAME = 'webswitch'
const configFile = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))
const config = configFile.services.serviceMesh.WebSwitch
const DEBUG = /true|yes|y/i.test(config.debug) || false
const heartbeat = config.heartbeat || 10000

/**
 * @type import("ws/lib/websocket")
 */
let ws

let port = config.port || SERVICE_NAME
let fqdn = config.host || 'switch.app-mesh.net'
let hostAddress
let servicePort
let uplinkCallback

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
export function onMessage (callback) {
  uplinkCallback = callback
}

/**
 * server sets uplink host
 */
export function setDestinationHost (host) {
  hostAddress = null
  const [FQDN, PORT] = host.split(':')
  fqdn = FQDN
  port = PORT
}

const protocol = type =>
  JSON.stringify({
    proto: 'webswitch',
    role: 'node',
    type,
    pid: process.pid
  })

/**
 * 
 * @param {WebSocket} ws 
 */
function setupHeartBeat (ws) {
  let receivedPong = false

  ws.addListener('pong', function () {
    !DEBUG || console.debug('received pong')
    receivedPong = true
  })

  ws.ping(0x9)

  setInterval(function () {
    if (receivedPong) {
      receivedPong = false
      ws.ping(0x9)
    } else {
      observer.notify('webswitchTimeout', 'webswitch server timeout', true)
      console.error('webswitch server timeout, try new conn')
      ws = null
    }
  }, heartbeat)
}

export async function subscribe (eventName, callback, observer) {
  observer.on(eventName, callback)
}

/**
 * Call this method to broadcast a message on the webswitch network
 * @param {*} event
 * @param {import('../../../domain/observer').Observer} observer
 * @returns
 */
export async function publish (event, observer) {
  if (!event) return
  if (!hostAddress) hostAddress = await getHostAddress(fqdn)
  if (!servicePort) servicePort = await getServicePort(fqdn)

  function sendEvent () {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${servicePort}`)

      ws.on('open', function () {
        ws.send(protocol())
        setupHeartBeat(ws)
      })

      ws.on('error', function (error) {
        console.error(ws.on, 'opening new conn after error', error)
        ws = null
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

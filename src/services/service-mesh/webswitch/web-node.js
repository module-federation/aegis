/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
'use strict'

import WebSocket from 'ws'
import dns from 'dns/promises'
import doh from 'dohjs'
import ObserverFactory from '../../../domain/observer'

const SERVICENAME = 'webswitch'
const configRoot = require('../../../config').aegisConfig
const config = configRoot.services.serviceMesh.WebSwitch
const DEBUG = /true|yes|y/i.test(config.debug) || false
const heartbeat = config.heartbeat || 10000
const observer = ObserverFactory.getInstance()

if (!configRoot) console.error('WebSwitch', 'cannot access config file')

/**
 * @type import("ws/lib/websocket")
 */
let ws

let port = config.port || SERVICENAME
let fqdn = config.host || 'switch.app-mesh.net'
let hostAddress
let servicePort
let uplinkCallback

async function resolveAddress (hostname) {
  try {
    // Use DNS over HTTPS
    const resolver = new doh.DohResolver('https://cloudflare-dns.com/dns-query')
    const result = await resolver.query(hostname, 'A')
    if (result.answers.length > 0) return result.answers[0].data

    // Fallback to DNS
    const addresses = await dns.resolve(hostname, 'A')
    if (addresses.length > 0) return addresses[0]

    // Include /etc/hosts
    const record = await dns.lookup(hostname)
    return record.address
  } catch (e) {
    console.warn(resolveAddress.name, 'warning', e)
  }
}

async function getHostAddress (hostname) {
  try {
    if (
      /(^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/.test(hostname)
    ) {
      return hostname
    }
    const address = await resolveAddress(hostname)
    console.info('resolved host address', address)
    return address
  } catch (error) {
    console.warn(getHostAddress.name, error)
  }
}

async function getServicePort (hostname) {
  try {
    if (port && port !== SERVICENAME) return port
    const services = await dns.resolveSrv(hostname)
    if (services) {
      const prt = services
        .filter(s => s.name === SERVICENAME)
        .reduce(s => s.port)
      if (prt) {
        return prt
      }
    }
    throw new Error('cant find port')
  } catch (error) {
    console.error(getServicePort.name, error)
  }
  return /true/i.test(process.env.SSL_ENABLED)
    ? process.env.SSL_PORT || 443
    : process.env.PORT || 80
}

/**
 * Set callback for uplink.
 * @param {*} callback
 */
export function onUplinkMessage (callback) {
  uplinkCallback = callback
}

/**
 * server sets uplink host
 */
export function setUplinkAddress (address) {
  hostAddress = null
  const [FQDN, PORT] = address.split(':')
  fqdn = FQDN
  port = PORT
}

const handshake = {
  getEvent () {
    return {
      proto: SERVICENAME,
      role: 'node',
      pid: process.pid
    }
  },
  serialize () {
    return JSON.stringify(this.getEvent())
  }
}

/**
 *
 * @param {WebSocket} ws
 */
function startHeartBeat (ws) {
  let receivedPong = false

  ws.addListener('pong', function () {
    console.assert(!DEBUG, 'received pong')
    receivedPong = true
  })

  ws.ping(0x9)

  const intervalId = setInterval(function () {
    if (receivedPong) {
      receivedPong = false
      ws.ping(0x9)
    } else {
      try {
        observer.notify('webswitchTimeout', 'server unresponsive', true)
        console.error('mesh server unresponsive, trying new connection')
        ws = null // get a new socket
        clearInterval(intervalId)
      } catch (error) {
        console.error(startHeartBeat.name, error)
      }
    }
  }, heartbeat)
}

/**
 * @callback subscription
 * @param {{eventName:string, model:import('../../../domain/index').Model}} eventData
 */

/**
 * @param {*} eventName
 * @param {subscription} callback
 * @param {*} observer
 * @param {{allowMultiple:boolean, once:boolean}} [options]
 */
export async function subscribe (eventName, callback, options = {}) {
  try {
    observer.on(eventName, callback, options)
  } catch (e) {
    console.error('subscribe', e)
  }
}

/**
 * Call this method to broadcast a message on the webswitch network
 * @param {*} event
 * @returns
 */
export async function publish (event) {
  try {
    if (!event) {
      console.error(publish.name, 'no event provided')
      return
    }
    if (!hostAddress) hostAddress = await getHostAddress(fqdn)
    if (!servicePort) servicePort = await getServicePort(fqdn)

    function sendEvent () {
      if (!ws) {
        const proto = /true/i.test(process.env.SSL_ENABLED) ? 'wss' : 'ws'
        ws = new WebSocket(`${proto}://${hostAddress}:${servicePort}`)

        ws.on('open', function () {
          ws.send(handshake.serialize())
          startHeartBeat(ws)
        })

        ws.on('error', function (error) {
          console.error(ws.on, 'opening new conn after error', error)
          ws = null
        })

        ws.on('message', async function (message) {
          const eventData = JSON.parse(message)
          console.assert(!DEBUG, 'received event:', eventData)

          if (eventData.eventName) {
            await observer.notify(eventData.eventName, eventData)
          }

          if (eventData.proto === SERVICENAME && eventData.pid) {
            ws.send(handshake.serialize())
            return
          }

          if (uplinkCallback) uplinkCallback(message)
        })

        return
      }

      function send () {
        if (ws?.readyState) {
          ws.send(JSON.stringify(event))
          return
        }
        setTimeout(send, 1000)
      }

      send()
    }
    sendEvent()
  } catch (e) {
    console.error('publish', e)
  }
}

export const initialize = () => publish(handshake.getEvent(), 10000)

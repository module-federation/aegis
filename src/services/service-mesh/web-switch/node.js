/**
 * webswitch (c)
 *
 * Websocket clients connect to a common ws server,
 * called a webswitch. When a client sends a message,
 * webswitch broadcasts the message to all other
 * connected clients, as well as any uplink webswitch
 * servers it can connect to. A Webswitch server can also
 * receive messgages from uplinks and will broadcast
 * those to its clients.
 */

'use strict'

/** @module services/mesh/Node */

import os from 'os'
import WebSocket from 'ws'
import Dns from 'multicast-dns'
import EventEmitter from 'events'
import { CircuitBreaker } from '../../index'
import { dns } from '../../dns'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const RECONNECTEVENT = 'webswitchReconnect'
const WEBSOCKETERROR = 'websocketError'

const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const retryInterval = config.retryInterval || 2000
const retryDenominator = config.retryDenominator || 30
const debug = config.debug || /true/i.test(process.env.DEBUG)
const heartbeat = config.heartbeat || 10000
const sslEnabled = /true/i.test(process.env.SSL_ENABLED)
const clearPort = process.env.PORT || 80
const cipherPort = process.env.SSL_PORT || 443
const activePort = sslEnabled ? cipherPort : clearPort
const activeProto = sslEnabled ? 'wss' : 'ws'
const activeHost =
  configRoot.services.cert.domain ||
  configRoot.general.fqdn ||
  process.env.DOMAIN
const proto = config.isSwitch ? activeProto : config.protocol
const port = config.isSwitch ? activePort : config.port
const host = config.isSwitch ? activeHost : config.host
const eventEmitter = new EventEmitter()

eventEmitter.on(TIMEOUTEVENT, () =>
  console.error({ error: 'webswitch unresponsive - trying new conn' })
)

eventEmitter.on(WEBSOCKETERROR, error =>
  console.error({ errMsg: 'websocket error', error })
)

const _url = (proto, host, port) =>
  proto && host && port ? `${proto}://${host}:${port}` : null

let serviceUrl = _url(proto, host, port)
let isBackupSwitch = config.isBackupSwitch || false
let activateBackup = false
let uplinkCallback

/** @type {function():string[]} */
let installedMicroservices = () => []
/** @type {WebSocket} */
let ws

const wsState = {
  0: 'CONNECTING',
  1: 'OPEN',
  2: 'CLOSING',
  3: 'CLOSED'
}

const DnsPriority = function (priority = 10, weight = 20) {
  let dnsPrio = { priority, weight }
  return {
    setHigh () {
      dnsPrio = { priority: 10, weight: 20 }
    },
    setMedium () {
      dnsPrio = { priority: 20, weight: 40 }
    },
    setLow () {
      dnsPrio = { priority: 40, weight: 80 }
    },
    getCurrent () {
      return dnsPrio
    },
    match (value) {
      const { priority, weight } = this.getCurrent()
      return value.priority === priority && value.weight === weight
    },
    equals (value) {
      return this.match(value.getCurrent())
    }
  }
}

const dnsTargetPriority = DnsPriority()
const dnsAssignedPriority = DnsPriority(
  config.priority || 40,
  config.weight || 80
)

function shouldTakeover () {
  if (dnsAssignedPriority.equals(dnsTargetPriority)) activateBackup = true
}

/**
 * Use multicast DNS to find the host
 * instance configured as the "switch"
 * node for the local area network.
 *
 * @returns {Promise<string>} url
 */
async function resolveServiceUrl () {
  const dns = Dns()
  let url

  return new Promise(function (resolve) {
    /**
     * Query DNS for the webswitch service.
     * "Recursively" retry by incrementing a
     * counter passed on the stack. Increment
     * the DNS priority based on the number of
     * retries. Change the switch service URL
     * accordingly. This provides HA in the event
     * the switch becomes inaccessible.
     *
     * @param {number} retries number of query attempts
     * @returns
     */
    function runQuery (retries = 0) {
      if (retries > retryDenominator / 3) {
        dnsTargetPriority.setMedium()
        shouldTakeover()
      } else if (retries > retryDenominator / 1.5) {
        dnsTargetPriority.setLow()
        shouldTakeover()
      }

      // query the service name
      dns.query({
        questions: [
          {
            name: SERVICENAME,
            type: 'SRV',
            data: dnsTargetPriority.getCurrent()
          }
        ]
      })

      if (url) {
        resolve(url)
        return
      }

      setTimeout(() => runQuery(++retries), retryInterval)
    }

    dns.on('response', function (response) {
      debug && console.debug({ fn: resolveServiceUrl.name, response })

      const answer = response.answers.find(
        a =>
          a.name === SERVICENAME &&
          a.type === 'SRV' &&
          dnsTargetPriority.match(a.data)
      )

      if (answer) {
        url = _url(proto, answer.data.target, answer.data.port)
        console.info({ msg: 'found dns service record for', SERVICENAME, url })
        resolve(url)
      }
    })

    dns.on('query', function (query) {
      debug && console.debug('got a query packet:', query)

      const question = query.questions.find(
        q => q.name === SERVICENAME || q.name === HOSTNAME
      )

      if (!question) {
        console.assert(!debug, {
          fn: 'dns query',
          msg: 'no questions',
          question
        })
        return
      }

      if (config.isSwitch || (isBackupSwitch && activateBackup)) {
        const answer = {
          answers: [
            {
              name: SERVICENAME,
              type: 'SRV',
              data: {
                port: activePort,
                target: activeHost,
                weight: dnsAssignedPriority.getCurrent().weight,
                priority: dnsAssignedPriority.getCurrent().priority
              }
            }
          ]
        }

        console.info({
          fn: dns.on.name + "('query')",
          isSwitch: config.isSwitch,
          isBackupSwitch,
          activateBackup,
          msg: 'answering query',
          questions,
          answer
        })

        dns.respond(answer)
      }
    })

    runQuery()
  })
}

/**
 * Set callback for uplink.
 * @param {function():Promise<void>} callback
 */
export function onUplinkMessage (callback) {
  uplinkCallback = callback
}

/**
 * server sets uplink host
 */
export function setUplinkUrl (uplinkUrl) {
  serviceUrl = uplinkUrl
  ws = null // trigger reconnect
}

/**
 * @typedef {object} HandshakeMsg
 * @property {string} proto the protocol 'web-switch'
 * @property {'node'|'browser'|'uplink'} role of the client
 * @property {number} pid - processid of the client or 1 for browsers
 * @property {string} serviceUrl - web-switch url for the client
 * @property {string[]} services - names of services running on the instance
 * @property {string} address - address of the client
 * @property {string} url - url to connect to client instance directly
 */
function format (event) {
  if (event instanceof ArrayBuffer) {
    // binary frame
    const view = new DataView(event)
    debug && console.debug('arraybuffer', view.getInt32(0))
    return event
  }
  if (typeof event === 'object') return JSON.stringify(event)
  return event
}

/**
 *
 * @param {object} event
 * @returns
 */
function send (event) {
  if (ws && wsState[ws.readyState] === 'OPEN') {
    const breaker = new CircuitBreaker(__filename + send.name, ws.send)
    breaker.detectErrors([TIMEOUTEVENT, WEBSOCKETERROR], eventEmitter)
    breaker.invoke(format(event))
    return
  }
  setTimeout(send, 1000, event)
}

/**
 *
 */
function startHeartbeat () {
  let receivedPong = true

  ws.addListener('pong', function () {
    console.assert(!debug, 'received pong')
    receivedPong = true
  })

  const intervalId = setInterval(async function () {
    if (receivedPong) {
      receivedPong = false
      // expect a pong back
      ws.ping(0x9)
    } else {
      try {
        clearInterval(intervalId)
        eventEmitter.emit(TIMEOUTEVENT)
        reconnect()
      } catch (error) {
        console.error(startHeartbeat.name, error)
      }
    }
  }, heartbeat)
}

/**
 *
 */
const protocol = {
  eventName: 'handshake',
  metaEvent: true,
  proto: SERVICENAME,
  role: 'node',
  pid: process.pid,
  hostname: os.hostname(),
  isBackupSwitch,
  activateBackup,

  serialize () {
    return JSON.stringify({
      ...this,
      services: installedMicroservices(),
      mem: process.memoryUsage(),
      cpu: process.cpuUsage()
    })
  },

  validate (message) {
    if (message) {
      let msg
      const valid = message.eventName || message.proto === this.proto

      if (typeof message === 'object') {
        msg = message = JSON.stringify(message)
      }

      const dynamicBackup = this.becomeBackupSwitch(message)
      if (dynamicBackup) DnsPriority.setBackupPriority()
      isBackupSwitch = true

      console.assert(valid, `invalid message ${msg}`)
      return valid
    }
    return false
  },

  becomeBackupSwitch (message) {
    return message.isBackupSwitch === true
  }
}

/**
 * @param {string} eventName
 * @param {(...args)=>void} callback
 */
export async function subscribe (eventName, callback) {
  try {
    eventEmitter.on(eventName, callback)
  } catch (error) {
    console.error({ fn: 'subscribe', error })
  }
}

/**
 *
 */
async function connectToServiceMesh () {
  if (!ws) {
    // null unless this is a switch or set manually by config file
    if (!serviceUrl) serviceUrl = await resolveServiceUrl()

    console.info({
      fn: connectToServiceMesh.name,
      msg: 'connecting to service mesh',
      serviceUrl
    })

    ws = new WebSocket(serviceUrl)

    console.info({
      fn: connectToServiceMesh.name,
      connectionState: wsState[ws.readyState]
    })

    ws.on('open', function () {
      console.info({
        fn: connectToServiceMesh.name,
        connectionState: wsState[ws.readyState]
      })
      send(protocol.serialize())
      startHeartbeat()
    })

    ws.on('error', function (error) {
      console.error({ fn: connectToServiceMesh.name, error })
      eventEmitter.emit(WEBSOCKETERROR, error)

      if ([ws.CLOSING, ws.CLOSED].includes(ws.readyState)) {
        reconnect()
      }
    })

    ws.on('message', async function (message) {
      try {
        const event = JSON.parse(message.toString())
        debug && console.debug('received event:', event)

        if (protocol.validate(event)) {
          // fire events
          if (event?.eventName !== '*') {
            // notify subscribers to this event
            eventEmitter.emit(event.eventName, event)

            // notify subscribers to all events
            eventEmitter.listeners('*').forEach(listener => listener(event))
          }
          // send to uplink if there is one
          if (uplinkCallback) await uplinkCallback(message)
          return
        }
        console.warn('unknown message type', message.toString())
      } catch (error) {
        console.error({ fn: ws.on.name + '("message")', error })
      }
    })
  }
}

/**
 *
 * @param {{services:()=>*}} [serviceInfo]
 */
export async function connect (serviceInfo = {}) {
  installedMicroservices = serviceInfo?.services
  await connectToServiceMesh()
}

let reconnecting = false

/**
 *
 */
async function reconnect (attempts = 0) {
  if (reconnecting) return
  reconnecting = true
  ws = null
  setTimeout(async () => {
    if (++attempts % 10 === 0) {
      // try new url after a minute
      serviceUrl = null
    }
    try {
      await connectToServiceMesh()
    } catch (error) {
      console.error({ fn: reconnect.name, error })
    }
    reconnecting = false
    if (!ws) await reconnect(attempts)
    else {
      eventEmitter.emit(RECONNECTEVENT)
      console.info('reconnected to switch')
    }
  }, 6000)
}

/**
 * Call this method to broadcast a message on the web-switch network
 * @param {object} event
 * @returns
 */
export async function publish (event) {
  try {
    if (!event) {
      console.error(publish.name, 'no event provided')
      return
    }
    await connectToServiceMesh()
    send(event)
  } catch (e) {
    console.error('publish', e)
  }
}

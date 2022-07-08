/**
 * webswitch (c)
 *
 * Websocket clients connect to a common ws server,
 * called a webswitch. When a client sends a message,
 * webswitch broadcasts the message to all other
 * connected clients, including a special webswitch
 * server that acts as an uplink to another network,
 * if one is defined. A Webswitch server can also
 * receive messgages from an uplink and will broadcast
 * those messages to its clients as well.
 */

'use strict'

import os from 'os'
import WebSocket from 'ws'
import Dns from 'multicast-dns'
import EventEmitter from 'events'
import CircuitBreaker, { logError } from '../../../domain/circuit-breaker.js'
import { clearInterval } from 'timers'
import { http } from '../../../adapters/controllers/index.js'
import { Agent } from 'https'
import { Socket } from 'dgram'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const ERROREVENT = 'webswitchError'

const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const retryInterval = config.retryInterval || 2000
const maxRetries = config.maxRetries || 99
const debug = config.debug || /true/i.test(process.env.DEBUG)
const heartbeat = config.heartbeat || 10000
const sslEnabled = /true/i.test(process.env.SSL_ENABLED)
const clearPort = process.env.PORT || 80
const cipherPort = process.env.SSL_PORT || 443
const activePort = sslEnabled ? cipherPort : clearPort
const activeProto = sslEnabled ? 'wss' : 'ws'
const activeHost =
  process.env.DOMAIN ||
  configRoot.services.cert.domain ||
  configRoot.general.fqdn
const protocol = config.isSwitch ? activeProto : config.protocol
const port = config.isSwitch ? activePort : config.port
const host = config.isSwitch ? activeHost : config.host

const _url = (proto, host, port) =>
  proto && host && port ? `${proto}://${host}:${port}` : null

let serviceUrl = _url(protocol, host, port)
let isBackupSwitch = config.isBackupSwitch || false
let activateBackup = false
let uplinkCallback

/** event broker */
const broker = new EventEmitter()
/** get list of local services */
let listServices = () => []
/** @type {WebSocket} */
let ws

let dnsPriority

const DnsPriority = {
  High: { priority: 10, weight: 20 },
  Medium: { priority: 20, weight: 40 },
  Low: { priority: 40, weight: 80 },
  setHigh () {
    dnsPriority = this.High
  },
  setMedium () {
    dnsPriority = this.Medium
  },
  setLow () {
    dnsPriority = this.Low
  },
  getCurrent () {
    return dnsPriority
  },
  matches (other) {
    const { priority, weight } = this.getCurrent()
    return other.priority === priority && other.weight === weight
  },
  setBackupPriority (config) {
    // set to low
    config.priority = this.Low.priority
    config.weight = this.Low.weight
  }
}

dnsPriority = DnsPriority.High

/**
 * If we have been selected to be a backup switch
 * check if its time to takeover.
 * Based on DNS load balancing: the lower the value
 * the higher the priority and wieght.
 */
function assumeSwitchRole () {
  if (DnsPriority.matches(config)) activateBackup = true
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
    console.log('resolving service url')
    dns.on('response', function (response) {
      debug && console.debug({ fn: resolveServiceUrl.name, response })

      const fromSwitch = response.answers.find(
        answer =>
          answer.name === SERVICENAME &&
          answer.type === 'SRV' &&
          DnsPriority.matches(answer.data)
      )

      if (fromSwitch) {
        url = _url(
          fromSwitch.data.proto,
          fromSwitch.data.target,
          fromSwitch.data.port
        )
        console.info({ msg: 'found dns service record for', SERVICENAME, url })
        resolve(url)
      }
    })

    /**
     * Query DNS for the webswitch service.
     * Recursively retry by incrementing a
     * counter we pass to ourselves on the
     * stack.
     *
     * @param {number} retries number of query attempts
     * @returns
     */
    function runQuery (retries = 0) {
      if (retries > maxRetries / 3) {
        DnsPriority.setMedium()
        if (retries > maxRetries / 2) {
          DnsPriority.setLow()
        }
        assumeSwitchRole()
      }

      // query the service name
      dns.query({
        questions: [
          {
            name: SERVICENAME,
            type: 'SRV',
            data: DnsPriority.getCurrent()
          }
        ]
      })

      if (url) {
        resolve(url)
        return
      }

      setTimeout(() => runQuery(++retries), retryInterval)
    }

    runQuery()

    dns.on('query', function (query) {
      debug && console.debug('got a query packet:', query)

      const forSwitch = query.questions.filter(
        question => question.name === SERVICENAME || question.name === HOSTNAME
      )

      if (!forSwitch[0]) {
        console.assert(!debug, {
          fn: 'dns query',
          msg: 'no questions',
          forSwitch
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
                proto: activeProto,
                port: activePort,
                target: activeHost,
                weight: config.weight,
                priority: config.priority
              }
            }
          ]
        }

        console.info({
          fn: dns.on.name + "('query')",
          isSwitch: config.isSwitch,
          isBackupSwitch,
          activateBackup,
          msg: 'answering query packet',
          forSwitch,
          answer
        })

        dns.respond(answer)
      }
    })
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
 * @property {string[]} models - names of models running on the instance
 * @property {string} address - address of the client
 * @property {string} url - url to connect to client instance directly
 */

/**
 * @callback subscription
 * @param {{
 *  eventName:string,
 *  model:import('../../../domain/index').Model
 * }} eventData
 */

/**
 * @param {string} eventName
 * @param {subscription} callback
 * @param {import('../../../domain/event-broker').EventBroker} broker
 * @param {{allowMultiple:boolean, once:boolean}} [options]
 */
export async function subscribe (eventName, callback) {
  try {
    broker.on(eventName, callback)
  } catch (error) {
    console.error({ fn: 'subscribe', error })
  }
}

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
  if (ws?.readyState === WebSocket.OPEN) {
    /** @type {import('../../../domain/circuit-breaker').breaker} */
    const breaker = new CircuitBreaker('webswitch-node-send', ws.send, {
      default: {
        errorRate: 100,
        callVolume: 100,
        intervalMs: 10000,
        fallbackFn: () => {
          if (ws) {
            ws.close(4990, 'circuitbreaker reconnect')
            reconnect()
          }
        }
      }
    })
    breaker.detectErrors([TIMEOUTEVENT, ERROREVENT], broker)
    breaker.invoke.call(ws, format(event))
    return
  }
  setTimeout(send, 1000, event)
}

/**
 * ping switch every x inverval and timeout
 * after x inverval if no pong resp received.
 * Timeout begins reconnect and eventually
 * new switch election process.
 *
 * @param {WebSocket} ws
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

      try {
        if (ws) ws.ping(0x9)
        else clearInterval(intervalId)
      } catch (error) {
        console.error({ fn: 'interval', error })
      }
      return
    }

    try {
      clearInterval(intervalId)
      broker.emit(TIMEOUTEVENT, { error: 'server unresponsive' })
      console.error({
        fn: startHeartbeat.name,
        receivedPong,
        msg: 'no response, trying new conn'
      })
      // terminate this socket
      if (ws) ws.close(4989, 'heartbeat timeout')
      // try to reconnect
      reconnect()
    } catch (error) {
      console.error(startHeartbeat.name, error)
    }
  }, heartbeat)
}

/**
 *
 */
const handshake = {
  eventName: 'handshake',
  proto: SERVICENAME,
  role: 'node',
  pid: process.pid,
  hostname: os.hostname(),
  isBackupSwitch,
  activateBackup,

  serialize () {
    return JSON.stringify({
      ...this,
      mem: process.memoryUsage(),
      cpu: process.cpuUsage(),
      apps: listServices()
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

function getProtocolHeaders () {
  const headers = new Map()
  headers.set('webswitch-name', os.hostname() + process.pid)
  headers.set('webswitch-role', 'node')
  return headers
}

/**
 *
 */
async function connectToServiceMesh (options = {}) {
  try {
    if (!ws) {
      if (!serviceUrl) serviceUrl = await resolveServiceUrl()
      console.info({ fn: connectToServiceMesh.name, serviceUrl })

      ws = new WebSocket(serviceUrl, {
        ...options,
        headers: getProtocolHeaders()
      })

      ws.on('open', function () {
        send(handshake.serialize())
        startHeartbeat()
      })

      ws.on('error', function (error) {
        console.error({ fn: connectToServiceMesh.name, error })
        broker.emit(ERROREVENT, error)
      })

      ws.on('close', function (code, reason) {
        console.log({
          msg: 'connection closed, terminating socket',
          code,
          reason: reason.toString()
        })

        // terminate on close
        if (ws) ws.terminate()
      })

      ws.on('message', async function (message) {
        try {
          const event = JSON.parse(message.toString())
          console.debug('received event:', event)

          if (handshake.validate(event)) {
            // process event
            if (event.eventName) {
              // notify subscribers of this event
              broker.emit(event.eventName, event)

              // notify subscribers of all events
              if (event.eventName !== '*') {
                broker.listeners('*').forEach(lstnr => lstnr(event))
              }

              // send to uplink if there is one
              if (uplinkCallback) await uplinkCallback(message)
            }
            return
          }
          console.warn('unknown message type', message.toString())
        } catch (error) {
          console.error({ fn: ws.on.name + '("message")', error })
        }
      })
    }
  } catch (error) {
    console.error({ fn: connectToServiceMesh.name, error })
  }
}

/**
 *
 * @param {{listServices:function():string[]}} [serviceInfo]
 */
export async function connect (serviceInfo = {}) {
  listServices = serviceInfo.listServices
  await connectToServiceMesh()
}

let reconnectTimerId
let attempts = 0

/**
 * Try to open new socket. Every other minute
 * try to get new service URL in case it has
 * failed over.
 */
async function reconnect () {
  try {
    if (reconnectTimerId) {
      console.warn({ msg: 'reconnect in progress', attempts })
      return
    }

    reconnectTimerId = setInterval(async () => {
      // if (++attempts % 10 === 0) {
      //   // try new url after a minute
      //   console.warn({ msg: 'try new service url', attempts })
      //   serviceUrl = null
      // }
      ++attempts

      if (ws) {
        console.warn('on retry, terminating existing socket')
        ws.close(4999, 'close for reconnect')
        stopping = true
        ws = null
      }

      // try reconnecting in a few secs with a new agent
      setTimeout(async () => {
        await connectToServiceMesh({ agent: new Agent() })

        if (ws?.readyState === WebSocket.OPEN) {
          clearInterval(reconnectTimerId)
          console.info({ msg: 'connected to switch', serviceUrl, attempts })
          reconnectTimerId = 0
          attempts = 0
          stopping = false
        }
      }, 4000)
    }, 6000)
  } catch (error) {
    console.error(error)
  }
}

let stopping = false

/**
 * Call this method to broadcast a message on the web-switch network
 * @param {object} event
 * @returns
 */
export async function publish (event) {
  try {
    if (stopping) return

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

/**
 * Close the connection to the webswitch.
 * Clear the heartbeat timer. Check after
 * a second if the conn is not CLOSED.
 * If not CLOSED terminate.
 * @param {string} reason
 * @returns
 */
export function close (reason) {
  try {
    stopping = true
    console.warn('disconnecting from mesh', reason)
    clearInterval(reconnectTimerId)
    if (!ws) return

    console.warn('connection closed, terminating socket')
    ws.close(4960, reason)

    // check after a while if its closed,
    setTimeout(() => {
      if (ws?.readyState !== ws?.CLOSED) ws.terminate()
    }, 2500)

    ws = null
  } catch (error) {
    console.error({ fn: close.name, error })
  }
}

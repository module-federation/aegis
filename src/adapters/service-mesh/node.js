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
import CircuitBreaker, { logError } from '../../domain/circuit-breaker.js'
import { clearInterval } from 'timers'
import { Agent } from 'https'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const ERROREVENT = 'webswitchError'

const configRoot = require('../../config').hostConfig
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

let headers = {
  'x-webswitch-host': os.hostname(),
  'x-webswitch-role': 'node',
  'x-webswitch-pid': process.pid
}

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

export class ServiceLocator {
  constructor (name, hostname, port, protocol, priority) {
    this.name = name
    this.hostname = hostname
    this.port = port
    this.protocol = protocol
    this.priority = priority
  }

  url () {
    const dns = Dns()
    let url

    return new Promise(function (resolve) {
      console.log('resolving service url')
      dns.on('response', function (response) {
        debug && console.debug({ fn: resolveUrl.name, response })

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
          console.info({
            msg: 'found dns service record for',
            SERVICENAME,
            url
          })
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

      dns.on('query', function (query) {
        debug && console.debug('got a query packet:', query)
        const forSwitch = query.questions.filter(
          question =>
            question.name === SERVICENAME || question.name === HOSTNAME
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

      runQuery()
    })
  }
}

export class ServiceMeshClient extends EventEmitter {
  constructor (url = null) {
    super()
    this.ws = null
    this.url = url || 'wss://aegis.module-federation.org:443'
    this.pong = true
    this.timerId = 0
    this.headers = {
      'x-webswitch-host': os.hostname(),
      'x-webswitch-role': 'node',
      'x-webswitch-pid': process.pid
    }
  }

  options (options) {
    if (options) this.opts = options
  }

  services () {
    return typeof this.opts?.listServices === 'function'
      ? this.opts.listServices()
      : []
  }

  telemetry () {
    return {
      proto: SERVICENAME,
      hostname: os.hostname(),
      role: 'node',
      pid: process.pid,
      telemetry: { ...process.memoryUsage(), ...process.cpuUsage() },
      services: this.services(),
      state: this.ws?.readyState || 'undefined'
    }
  }

  async resolve () {
    const resolver = new ServiceLocator()
    return resolver.url()
  }

  async connect (options = null) {
    if (this.ws) return
    this.options(options)
    this.url = this.url || (await this.resolve())
    console.debug({ connect: this.telemetry() })
    this.ws = new WebSocket(this.url, {
      headers: this.headers,
      protocol: 'webswitch'
    })
    this.ws.on('close', code => {
      if (code !== 4999) {
        this.close(4988, 'acknowledge')
        setTimeout(() => this.connect(), 1000)
      }
    })
    this.ws.on('open', () => {
      console.debug({ open: this.telemetry() })
      this.send(this.telemetry())
      this.heartbeat()
    })
    this.ws.on('message', msg => {
      try {
        const obj = JSON.parse(msg.toString())
        this.emit(obj.eventName || 'undef', obj)
        this.listeners('*').forEach(cb => cb(obj))
      } catch (error) {
        console.error(error.message)
      }
    })
    this.ws.on('pong', () => (this.pong = true))
  }

  heartbeat () {
    if (this.pong) {
      this.pong = false
      this.ws.ping()
      setTimeout(() => this.heartbeat(), 8000)
    } else {
      console.debug('timeout')
    }
  }

  format (msg) {
    if (msg instanceof ArrayBuffer) {
      // binary frame
      const view = new DataView(msg)
      console.debug('arraybuffer', view.getInt32(0))
      return msg
    }
    if (typeof msg === 'object') return JSON.stringify(msg)
    return msg
  }

  send (msg) {
    this.ws.send(JSON.stringify(msg))
    // if (this.ws?.readyState === this.ws.OPEN) {
    //   const breaker = CircuitBreaker('webswitch', this.ws.send)
    //   breaker.invoke.call(this, this.format(msg))
    // } else setTimeout(() => send(msg), 4000)
  }

  publish (msg) {
    this.connect()
    this.send(msg)
  }

  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }

  close (code, reason) {
    if (!ws) return
    clearInterval(this.timerId)
    this.ws.close(code, reason)
    process.nextTick(() => this.ws.terminate())
    this.timerId = 0
    this.ws = null
  }
}

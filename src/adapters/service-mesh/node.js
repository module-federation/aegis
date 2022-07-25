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
import EventEmitter from 'events'
import CircuitBreaker, { logError } from '../../domain/circuit-breaker.js'
import { ServiceLocator } from './service-locator.js'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const ERROREVENT = 'webswitchError'

const configRoot = require('../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const isPrimary =
  /true/i.test(process.env.SWITCH) ||
  (typeof process.env.SWITCH === 'undefined' && config.isSwitch)
const maxRetries = config.maxRetries || 120
const debug = config.debug || /true/i.test(process.env.DEBUG)
const heartbeatms = config.heartbeat || 10000
const sslEnabled = /true/i.test(process.env.SSL_ENABLED)
const clearPort = process.env.PORT || 80
const cipherPort = process.env.SSL_PORT || 443
const activePort = sslEnabled ? cipherPort : clearPort
const activeProto = sslEnabled ? 'wss' : 'ws'
const activeHost =
  process.env.DOMAIN ||
  configRoot.services.cert.domain ||
  configRoot.general.fqdn
const protocol = isPrimary ? activeProto : config.protocol
const port = isPrimary ? activePort : config.port
const host = isPrimary ? activeHost : config.host
const isBackup = config.isBackupSwitch

const constructUrl = () =>
  protocol && host && port ? `${protocol}://${host}:${port}` : null

console.debug({ url: constructUrl() })

let uplinkCallback

export class ServiceMeshClient extends EventEmitter {
  constructor (url = null) {
    super()
    this.ws = null
    this.url = url || constructUrl()
    this.name = SERVICENAME
    this.serviceList = []
    this.isPrimary = isPrimary
    this.isBackup = isBackup
    this.pong = true
    this.timerId = 0
    this.verifiableData = 'it tolls for thee'
    this.reconnecting = false
    this.headers = {
      'x-webswitch-host': os.hostname(),
      'x-webswitch-role': 'node',
      'x-webswitch-pid': process.pid
    }
  }

  services () {
    return this.options.listServices
      ? (this.serviceList = this.options.listServices())
      : this.serviceList
  }

  telemetry () {
    return {
      eventName: 'telemetry',
      proto: this.name,
      hostname: os.hostname(),
      role: 'node',
      pid: process.pid,
      telemetry: { ...process.memoryUsage(), ...process.cpuUsage() },
      services: this.services(),
      state: this.ws?.readyState || 'undefined'
    }
  }

  async resolveUrl () {
    const locator = new ServiceLocator({
      name: this.name,
      serviceUrl: constructUrl(),
      primary: this.isPrimary,
      backup: this.isBackup,
    })
    if (this.isPrimary) {
      locator.advertiseLocation()
      return constructUrl()
    }
    return locator.receiveLocation()
  }

  async connect (options = {}) {
    if (this.ws) {
      console.info('conn already open')
      return
    }
    this.options = options
    this.url = await this.resolveUrl()
    this.ws = new WebSocket(this.url, {
      headers: this.headers,
      protocol: SERVICENAME
    })
    this.ws.binaryType = 'arraybuffer'
    this.ws.on('close', (code, reason) => {
      console.log('received close frame', code, reason.toString())
      if ([1006, 4040].includes(code)) {
        if (this.reconnecting) return
        this.reconnecting = true
        clearTimeout(this.timerId)
        this.close(code, reason)
        setTimeout(() => this.connect(), 3000)
      }
    })
    this.ws.on('open', () => {
      console.log('connection open')
      this.reconnecting = false
      this.send(this.telemetry())
      this.heartbeat()
    })
    this.ws.on('message', message => {
      try {
        const event = this.decode(message)
        if (!event.eventName) {
          debug && console.debug({ missingEventName: event })
          this.emit('missingEventName', event)
          return
        }
        this.emit(event.eventName, event)
        this.listeners('*').forEach(listener => listener(event))
      } catch (error) {
        console.error({ fn: this.connect.name, error })
      }
    })
    this.ws.on('error', error => {
      console.error({ fn: this.connect.name, error })
    })
    this.ws.on('pong', () => (this.pong = true))
  }

  heartbeat () {
    if (this.pong) {
      this.pong = false
      this.ws.ping()
      this.timerId = setTimeout(() => this.heartbeat(), heartbeatms)
    } else {
      if (this.reconnecting) return
      this.reconnecting = true
      console.warn('timeout')
      this.close(4877, 'timeout')
      this.emit(TIMEOUTEVENT, this.telemetry())
      setTimeout(() => this.connect(), 8000)
    }
  }

  primitives = {
    encode: {
      object: msg => Buffer.from(JSON.stringify(msg)),
      string: msg => Buffer.from(msg),
      number: msg => console.error('unsupported', msg),
      undefined: msg => console.error('unsupported', msg)
    },
    decode: {
      object: msg => JSON.parse(Buffer.from(msg).toString()),
      string: msg => Buffer.from(msg).toString(),
      number: msg => console.error('unsupported', msg),
      undefined: msg => console.error('unsupported', msg)
    }
  }

  encode (msg) {
    const encoded = this.primitives.encode[typeof msg](msg)
    debug && console.debug({ encoded })
    return encoded
  }

  decode (msg) {
    const decoded = this.primitives.decode[typeof msg](msg)
    debug && console.debug({ decoded })
    return decoded
  }

  send (msg) {
    if (this.ws?.readyState === this.ws.OPEN) {
      const breaker = CircuitBreaker('webswitch', msg => {
        debug && console.debug({ fn: this.send.name, msg })
        this.ws.send(this.encode(msg))
      })
      breaker.invoke(msg)
    } else setTimeout(() => this.send(msg), 8000)
  }

  async publish (msg) {
    debug && console.debug({ fn: this.publish.name, msg })
    await this.connect()
    this.send(msg)
  }

  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }

  close (code, reason) {
    console.debug('closing socket')
    this.ws.removeAllListeners()
    this.ws.close(code, reason)
    this.ws.terminate()
    this.ws = null
  }
}

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
import CircuitBreaker from '../../domain/circuit-breaker.js'
import { ServiceLocator } from './service-locator.js'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'
import { dependencies } from 'webpack'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const CONNECTERROR = 'webswitchConnect'
const WSOCKETERROR = 'webswitchWsocket'

const configRoot = require('../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const isPrimary =
  /true/i.test(process.env.SWITCH) ||
  (typeof process.env.SWITCH === 'undefined' && config.isSwitch)

const debug = config.debug || /true/i.test(process.env.DEBUG)
const heartbeatMs = config.heartbeat || 10000
const sslEnabled = /true/i.test(process.env.SSL_ENABLED)
const clearPort = process.env.PORT || 80
const cipherPort = process.env.SSL_PORT || 443
const activePort = sslEnabled ? cipherPort : clearPort
const activeProto = sslEnabled ? 'wss' : 'ws'
const activeHost =
  process.env.DOMAIN ||
  configRoot.services.cert.domain ||
  configRoot.general.fqdn ||
  os.hostname()

const protocol = isPrimary ? activeProto : config.protocol
const port = isPrimary ? activePort : config.port
const host = isPrimary ? activeHost : config.host
const isBackup = config.isBackupSwitch
const apiProto = sslEnabled ? 'https' : 'http'
const apiUrl = `${apiProto}://${activeHost}:${activePort}`

const constructUrl = () =>
  protocol && host && port ? `${protocol}://${host}:${port}` : null

let uplinkCallback

export class ServiceMeshClient extends EventEmitter {
  constructor (dependencies) {
    super()
    this.dependencies = dependencies
    this.ws = null
    this.url = constructUrl()
    this.name = SERVICENAME
    this.serviceList = []
    this.isPrimary = isPrimary
    this.isBackup = isBackup
    this.pong = true
    this.timerId = 0
    this.RECONNECTING = false
    this.sendQueue = []
    this.sendQueueLimit = 20
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
      apiUrl,
      heartbeatMs,
      hostname: os.hostname(),
      role: 'node',
      pid: process.pid,
      telemetry: { ...process.memoryUsage(), ...process.cpuUsage() },
      services: this.services(),
      state: this.ws?.readyState || 'undefined'
    }
  }

  async resolveUrl () {
    this.dependencies.serviceLocatorInit({
      name: this.name,
      serviceUrl: constructUrl(),
      primary: this.isPrimary,
      backup: this.isBackup
    })
    if (this.isPrimary) {
      this.dependencies.serviceLocatorAnswer()
      return constructUrl()
    }
    return this.dependencies.serviceLocatorListen()
  }

  async connect (options = {}) {
    if (this.ws) {
      console.info('conn already open', this.ws.readyState)
      return
    }
    this.options = options
    this.url = await this.resolveUrl()
    this.ws = this.dependencies.websocketConnect(this.url, {
      agent: false,
      headers: this.headers,
      protocol: SERVICENAME
    })

    this.ws.on('close', (code, reason) => {
      console.log('received close frame', code, reason.toString())
      this.ws.removeAllListeners()
      clearTimeout(this.timerId)
      this.ws = null
      setTimeout(() => this.connect(), 3000)
    })

    this.ws.on('open', () => {
      console.log('connection open')
      this.send(this.telemetry())
      this.once('timeout', this.timeout)
      this.heartbeat()
      setTimeout(() => this.sendQueuedMsgs(), 3000).unref()
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
      this.emit(WSOCKETERROR, error)
      console.error({ fn: this.connect.name, error })
    })

    this.ws.on('pong', () => (this.pong = true))
  }

  timeout () {
    console.warn('timeout')
    this.emit(TIMEOUTEVENT, this.telemetry())
    this.close(4911, 'timeout')
  }

  heartbeat () {
    if (!this.ws) return
    if (this.pong) {
      this.pong = false
      this.ws.ping()
      this.timerId = setTimeout(() => this.heartbeat(), heartbeatMs)
      this.timerId.unref()
    } else {
      clearTimeout(this.timerId)
      this.emit('timeout')
    }
  }

  primitives = {
    encode: {
      object: msg => Buffer.from(JSON.stringify(msg)),
      string: msg => Buffer.from(JSON.stringify(msg)),
      number: msg => Buffer.from(JSON.stringify(msg)),
      symbol: msg => console.log('unsupported', msg),
      undefined: msg => console.log('undefined', msg)
    },
    decode: {
      object: msg => JSON.parse(Buffer.from(msg).toString()),
      string: msg => JSON.parse(Buffer.from(msg).toString()),
      number: msg => JSON.parse(Buffer.from(msg).toString()),
      symbol: msg => console.log('unsupported', msg),
      undefined: msg => console.error('undefined', msg)
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
    if (
      this.ws &&
      this.ws.readyState === this.ws.OPEN &&
      this.ws.bufferedAmount < 1
    ) {
      this.dependencies.websocketSend(this.encode(msg), {
        binary: true,
        headers: {
          ...this.headers,
          'idempotency-key': nanoid()
        }
      })

      breaker.detectErrors([TIMEOUTEVENT, CONNECTERROR, WSOCKETERROR], this)
      breaker.invoke(msg)
      return true
    } else if (this.sendQueue.length < this.sendQueueLimit) {
      this.sendQueue.push(msg)
    } else {
      this.manageSendQueue(msg)
    }
    return false
  }

  sendQueuedMsgs () {
    try {
      let sent = true
      while (this.sendQueue.length > 0 && sent)
        sent = this.send(this.sendQueue.pop())
    } catch (error) {
      console.error({ fn: this.sendQueuedMsgs.name, error })
    }
  }

  manageSendQueue (msg) {
    this.sendQueue.push(msg)
    this.saveSendQueue(queue => {
      return new Promise(resolve => {
        setTimeout(() => {
          this.sendQueuedMsgs(queue)
          resolve(queue)
        }, 3000).unref()
      })
    })
  }

  readFileQueue (filePath) {
    try {
      return JSON.parse(readFileSync(filePath))
    } catch (error) {
      console.error({ fn: readFileSync.name, error })
      return []
    }
  }

  writeFileQueue (filePath, queue) {
    try {
      writeFileSync(filePath, JSON.stringify(queue))
    } catch (error) {
      this.emit(`${this.writeFileSync.name}_${error.name}`, error)
      console.error({ fn: writeFileSync.name, error })
    }
  }

  async saveSendQueue (sender) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'senderQueue.json')
      const storedQueue = this.readFileQueue(filePath)
      const concatQueue = storedQueue.concat(this.sendQueue)
      const unsentQueue = await sender(concatQueue)
      this.writeFileQueue(filePath, unsentQueue)
    } catch (error) {
      console.error({ fn: this.saveSendQueue.name, error })
    }
  }

  async publish (msg) {
    await this.connect()
    this.send(msg)
  }

  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }

  close (code, reason) {
    this.off('timeout', this.timeout)
    console.debug('closing socket')
    this.ws.close(code, reason)
  }
}

export function makeClient (config) {
  return async function ({ eventName, eventAction }) {
    return {
      eventName,
      eventAction,
      eventTime: Date.now(),
      config,
      client,
      connect () {
        this.client = ServiceMeshClient(this)
        this.client.connect()
      },
      publish (event) {
        this.client.publish(event)
      },
      subscribe (eventName, handler) {
        this.client.subscribe(eventName, handler)
      }
    }
  }
}

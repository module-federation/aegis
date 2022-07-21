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
import fs from 'fs'
import path from 'path'
import CircuitBreaker, { logError } from '../../domain/circuit-breaker.js'
import { ServiceLocator } from './service-locator.js'
import { verify, sign, constants } from 'crypto'
import { AsyncLocalStorage } from 'async_hooks'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const TIMEOUTEVENT = 'webswitchTimeout'
const ERROREVENT = 'webswitchError'

const configRoot = require('../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const isPrimary =
  /true/i.test(process.env.SWITCH) ||
  (typeof process.env.SWITCH === 'undefined' && config.isSwitch)
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
    this.isPrimary = isPrimary
    this.isBackup = isBackup
    this.pong = true
    this.timerId = 0
    this.sharedSecret = 'it tolls for thee'
    // this.privateKey = fs.readFileSync(
    //   path.join(process.cwd(), 'cert/mesh/privateKey.pem'),
    //   'utf-8'
    // )
    // this.publicKey = fs.readFileSync(
    //   path.join(process.cwd(), 'cert/mesh/publicKey.pem'),
    //   'utf-8'
    // )
    this.headers = {
      'x-webswitch-host': os.hostname(),
      'x-webswitch-role': 'node',
      'x-webswitch-pid': process.pid
      // 'x-webswitch-signature': this.createSignature(
      //   this.publicKey,
      //   this.sharedSecret
      // )
    }
  }

  createSignature (privateKey, data) {
    const signature = sign('sha256', Buffer.from(data), {
      key: privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING
    })
    console.log(signature.toString('base64'))
    return signature
  }

  verifySignature (signature, data) {
    return verify(
      'sha256',
      Buffer.from(data),
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_PSS_PADDING
      },
      Buffer.from(signature.toString('base64'), 'base64')
    )
  }

  services () {
    return this.options.listServices ? this.options.listServices() : []
  }

  telemetry () {
    return {
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
      backup: this.isBackup
    })
    if (this.isPrimary) {
      locator.advertiseLocation()
      return constructUrl()
    }
    return locator.receiveLocation()
  }

  async connect (options = null) {
    if (this.ws) return
    this.options = options || {}
    this.url = await this.resolveUrl()
    this.ws = new WebSocket(this.url, {
      headers: this.headers
    })
    this.ws.on('close', (code, reason) => {
      console.log('received close frame', code, reason.toString())
      if (code !== 4001) this.close(code, reason)
    })
    this.ws.on('open', () => {
      console.log('connection open')
      this.send(this.telemetry())
      this.heartbeat()
    })
    this.ws.on('message', msg => {
      try {
        const event = JSON.parse(msg.toString())
        if (!event.eventName) {
          console.log('no event name', event)
          return
        }
        this.emit(event.eventName, event)
        this.listeners('*').forEach(cb => cb(event))
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
      this.timerId = setTimeout(() => this.heartbeat(), 10000)
    } else {
      console.debug('timeout')
      if (this.ws?.readyState !== this.ws.CLOSED) return
      this.ws.terminate()
      this.ws = null
      this.connect()
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
    if (this.ws?.readyState === this.ws.OPEN) {
      const breaker = CircuitBreaker('webswitch', msg => this.ws.send(msg))
      breaker.invoke(this.format(msg))
    } else setTimeout(() => breaker.invoke(this.format(msg)), 4000)
  }

  async publish (msg) {
    console.debug({ fn: this.publish.name, msg })
    await this.connect()
    this.send(msg)
  }

  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }

  close (code, reason) {
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) return
    this.ws.removeAllListeners()
    this.ws.close(4001, `${code} ${reason}`)
    this.ws.terminate()
    this.ws = null
  }
}

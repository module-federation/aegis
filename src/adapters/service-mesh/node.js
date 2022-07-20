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
import { sign, verify, constants } from 'crypto'
import fs from 'fs'
import path from 'path'
import { ClientSession } from 'mongodb'
import { AsyncLocalStorage } from 'async_hooks'

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
const isPrimary = /true/i.test(process.env.SWITCH) || 
      (typeof process.env.SWITCH === 'undefined' && config.isSwitch)
const isBackup = config.isBackupSwitch

const URL = () =>
  protocol && host && port ? `${protocol}://${host}:${port}` : null

console.debug(URL())

let uplinkCallback

export class ServiceLocator {
  constructor ({
    name,
    primary = false,
    backup = false,
    maxRetries = 20,
    retryInterval = 5000
  } = {}) {
    if (!name) throw new Error('missing service name')
    this.url = null
    this.name = name
    this.dns = Dns()
    this.isPrimary = primary
    this.isBackup = backup
    this.maxRetries = maxRetries
    this.retryInterval = retryInterval
    this.privateKey = fs.readFileSync(
      path.join(process.cwd(), 'cert/mesh/privateKey.pem'),
      'utf-8'
    )
    this.publicKey = fs.readFileSync(
      path.join(process.cwd(), 'cert/mesh/publicKey.pem'),
      'utf-8'
    )
    this.verifiable = 'i am the ocean of lakes'
    this.signature = this.createSignature(this.privateKey, this.verifiable)
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

  /**
   * Query DNS for the webswitch service.
   * Recursively retry by incrementing a
   * counter we pass to ourselves on the
   * stack.
   *
   * @param {number} retries number of query attempts
   * @returns
   */
  runQuery (retries = 0) {
    // have we found the url?
    if (this.url) return

    if (retries > this.maxRetries) this.activateBackup = true

    console.debug('looking for srv %s retries: %d', this.name, retries)
    // then query the service name
    this.dns.query({
      questions: [
        {
          name: this.name,
          type: 'SRV'
        }
      ]
    })

    // keep asking
    setTimeout(() => this.runQuery(++retries), this.retryInterval)
  }

  runAsServer () {
    return this.isPrimary || (this.isBackup && this.activateBackup)
  }

  resolveUrl () {
    return new Promise(resolve => {
      console.log('resolving service url')

      this.dns.on('response', response => {
        debug && console.debug({ fn: this.resolveUrl.name, response })

        const fromServer = response.answers.find(
          answer => answer.name === this.name && answer.type === 'SRV' //&&
          //answer.data?.signature //&&
          //this.verifySignature(this.publicKey, answer.data.signature)
        )

        if (fromServer) {
          const { proto, target, port } = fromServer.data
          this.url = `ws://${target}:${port}`

          console.info({
            msg: 'found dns service record for',
            service: this.name,
            url: this.url
          })
          resolve(this.url)
        }
      })

      this.dns.on('query', query => {
        debug && console.debug('got a query packet:', query)

        const fromClient = query.questions.filter(
          question => question.name === this.name
        )

        if (fromClient && this.runAsServer()) {
          const answer = {
            answers: [
              {
                name: this.name,
                type: 'SRV',
                data: {
                  proto: 'ws',
                  port: activePort,
                  target: activeHost,
                  weight: config.weight,
                  priority: config.priority,
                  signature: this.signature
                }
              }
            ]
          }
          console.info({
            fn: this.dns.on.name + "('query')",
            isSwitch: config.isSwitch,
            isBackupSwitch: isBackup,
            activateBackup: this.activateBackup,
            msg: 'asserting service role',
            fromClient,
            answer
          })
          this.dns.respond(answer)
        }
      })

      this.runQuery()
    })
  }
}

export class ServiceMeshClient extends EventEmitter {
  constructor (url = null) {
    super()
    this.ws = null
    this.url = URL()
    this.name = SERVICENAME
    this.isPrimary = isPrimary
    this.isBackup = isBackup
    this.pong = true
    this.timerId = 0
    this.headers = {
      'x-webswitch-host': os.hostname(),
      'x-webswitch-role': 'node',
      'x-webswitch-pid': process.pid
    }
  }

  services () {
    return typeof this.options.listServices === 'function'
      ? this.options.listServices()
      : []
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
    const locate = new ServiceLocator({
      name: this.name,
      url: this.url,
      primary: this.isPrimary,
      backup: this.isBackup
    })
    return locate.resolveUrl()
  }

  async connect (options = null) {
    if (this.ws) return
    this.options = options || {}
    this.url = this.url || (await this.resolveUrl())
    if (this.isPrimary) this.resolveUrl()
    this.ws = new WebSocket(this.url, {
      headers: this.headers
    })
    this.ws.on('close', (code, reason) => {
      console.log('received close frame', code, reason.toString())
      this.close(code, reason)
      setTimeout(() => this.connect(), 8000)
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
    this.ws.send(JSON.stringify(msg))
    // if (this.ws?.readyState === this.ws.OPEN) {
    //   const breaker = CircuitBreaker('webswitch', this.ws.send)
    //   breaker.invoke.call(this, this.format(msg))
    // } else setTimeout(() => breaker.invoke.call(this, this.format(msg)), 4000)
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
    this.ws.close(code, reason)
    this.ws.terminate()
    this.ws = null
  }
}

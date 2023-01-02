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
import EventEmitter from 'events'
import { nanoid } from 'nanoid'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const HBEATTIMEOUT = 'heartBeatTimeout'
const WSOCKETERROR = 'webSocketError'

const isPrimary = /true/i.test(process.env.SWITCH)
const isBackup = /true/i.test(process.env.BACKUP)
const debug = /true/i.test(process.env.DEBUG)
const heartbeatMs = 10000
const sslEnabled = /true/i.test(process.env.SSL_ENABLED)
const clearPort = process.env.PORT || 80
const cipherPort = process.env.SSL_PORT || 443
const activePort = sslEnabled ? cipherPort : clearPort
const activeProto = sslEnabled ? 'wss' : 'ws'
const activeHost = process.env.DOMAIN || os.hostname()
const proto = isPrimary ? activeProto : process.env.SWITCH_PROTO
const port = isPrimary ? activePort : process.env.SWITCH_PORT
const host = isPrimary ? activeHost : process.env.SWITCH_HOST
const override = /true/i.test(process.env.SWITCH_OVERRIDE)
const apiProto = sslEnabled ? 'https' : 'http'
const apiUrl = `${apiProto}://${activeHost}:${activePort}`

function serviceUrl () {
  const url = `${proto}://${host}:${port}`
  if (proto && host && port) return url
  if (isPrimary) throw new Error(`invalid url ${url}`)
  return null
}

/**
 * Service mesh client impl. Uses websocket and service-locator
 * adapters through ports injected into the {@link mesh} model.
 * Cf. modelSpec by the same name, i.e. `webswitch`.
 */
export class ServiceMeshClient extends EventEmitter {
  constructor (mesh) {
    super('webswitch')
    this.url
    this.mesh = mesh
    this.name = SERVICENAME
    this.isPrimary = isPrimary
    this.isBackup = isBackup
    this.pong = true
    this.heartbeatTimer = 3000
    this.headers = {
      'x-webswitch-host': os.hostname(),
      'x-webswitch-role': 'node',
      'x-webswitch-pid': process.pid
    }
  }

  /**
   *
   * @param {number} asyncId id's instance to kill
   * @returns {{telemetry:{mem:number,cpu:number}}}
   */
  telemetry () {
    return {
      eventName: 'telemetry',
      proto: this.name,
      apiUrl,
      heartbeatMs,
      hostname: os.hostname(),
      role: 'node',
      pid: process.pid,
      telemetry: {
        ...process.memoryUsage(),
        ...process.cpuUsage(),
        ...performance.nodeTiming
      },
      services: this.mesh.listServices(),
      socketState: this.mesh.websocketStatus() || 'undefined'
    }
  }

  /**
   * Zero-config, self-forming mesh network:
   * Discover URL of broker to connect to, or
   * if this is the broker, cast the local url
   * @returns {Promise<string>} url
   */
  async resolveUrl () {
    await this.mesh.serviceLocatorInit({
      serviceUrl: serviceUrl(),
      name: this.name,
      primary: this.isPrimary,
      backup: this.isBackup
    })
    if (this.isPrimary) {
      await this.mesh.serviceLocatorAnswer()
      return serviceUrl()
    }
    return override ? serviceUrl() : this.mesh.serviceLocatorAsk()
  }

  /**
   * Use multicast dns to resolve broker url. Connect to
   * service mesh broker. Allow listeners to subscribe to
   * indivdual or all events. Send binary messages with
   * protocol and idempotentency headers. Periodically send
   * telemetry data.
   *
   * @param {*} options
   * @returns
   */
  async connect (options = { binary: true }) {
    this.options = options
    this.url = await this.resolveUrl()

    this.mesh.websocketConnect(this.url, {
      agent: false,
      headers: this.headers,
      protocol: SERVICENAME,
      useBinary: options.binary
    })

    this.mesh.websocketOnOpen(() => {
      console.log('connection open')
      this.send(this.telemetry())
      this.heartbeat()
      setTimeout(() => this.sendQueuedMsgs(), 3000)
    })

    this.mesh.websocketOnMessage(message => {
      if (!message.eventName) {
        debug && console.debug({ missingEventName: message })
        this.emit('missingEventName', message)
        return
      }
      try {
        this.emit(message.eventName, message)
        this.listeners('*').forEach(listener => listener(message))
      } catch (error) {
        console.error({ fn: this.connect.name, error })
      }
    })

    this.mesh.websocketOnError(error => {
      this.emit(WSOCKETERROR, error)
      console.error({ fn: this.connect.name, error })
    })

    this.mesh.websocketOnClose((code, reason) => {
      console.log({
        msg: 'received close frame',
        code,
        reason: reason?.toString()
      })
      clearTimeout(this.heartbeatTimer)
      setTimeout(() => {
        console.debug('reconnect due to socket close')
        this.connect()
      }, 5000)
    })

    this.mesh.websocketOnPong(() => (this.pong = true))
    this.once('timeout', this.timeout)
  }

  timeout () {
    console.warn('timeout')
    this.emit(HBEATTIMEOUT, this.telemetry())
    this.mesh.websocketTerminate()
    setTimeout(() => {
      console.debug('reconnect due to timeout')
      this.connect()
    }, 5000)
  }

  heartbeat () {
    if (this.pong) {
      this.pong = false
      this.mesh.websocketPing()
      this.heartbeatTimer = setTimeout(() => this.heartbeat(), heartbeatMs)
    } else {
      clearTimeout(this.heartbeatTimer)
      this.emit('timeout')
    }
  }

  /**
   * Convert message to binary and send with protocol and idempotency headers.
   * If message cannot be sent because of connection state or buffering queue
   * message in domain object for retry later. Using a domain object ensures
   * persistence of the queue across boots.
   *
   * @param {object} msg
   * @returns {Promise<boolean>} true if sent, false if not
   */
  send (msg) {
    const sent = this.mesh.websocketSend(msg, {
      headers: {
        ...this.headers,
        'idempotency-key': nanoid()
      }
    })
    if (sent) return true
    this.mesh.enqueue(msg)
    return false
  }

  /**
   * Send any messages buffered in `sendQueue`.
   */
  sendQueuedMsgs () {
    let sent = true
    while (this.mesh.queueDepth() > 0 && sent)
      sent = this.send(this.mesh.dequeue())
  }

  /**
   * Connects if needed then sends message to mesh broker service.
   * @param {*} msg
   */
  publish (msg) {
    return this.send(msg)
  }

  /**
   * Register handler to fire on event
   * @param {string} eventName
   * @param {function()} callback
   */
  subscribe (eventName, callback) {
    this.on(eventName, callback)
  }

  /**
   * A new object will be created on system reload.
   * Dispose of the old one. Run in context to
   * distinguish between the new and old instance.
   *
   * @param {*} code
   * @param {*} reason
   */
  async close (code, reason) {
    console.debug('closing socket')
    await this.mesh.save() // save queued messages
    this.removeAllListeners()
    this.mesh.websocketClose(code, reason)
  }
}

/**
 * Domain model factory function. This model is
 * used internally by the Aegis framework as a
 * pluggable service mesh client. Implement the
 * the methods below to create a new plugin.
 *
 * @param {*} dependencies injected depedencies
 * @returns
 */
export function makeClient (dependencies) {
  let client
  return function ({ listServices }) {
    return {
      listServices,
      sendQueue: [],
      sendQueueMax: 1000,

      queueDepth () {
        return this.sendQueue.length
      },

      enqueue (msg) {
        this.sendQueue.push(msg)
      },

      dequeue () {
        return this.sendQueue.shift()
      },

      getClient () {
        if (client) return client
        client = new ServiceMeshClient(this)
        return client
      },

      async connect (options) {
        this.getClient().connect(options)
      },

      async publish (event) {
        this.getClient().publish(event)
      },

      subscribe (eventName, handler) {
        this.getClient().subscribe(eventName, handler)
      },

      async close (code, reason) {
        this.getClient().close(code, reason)
      }
    }
  }
}

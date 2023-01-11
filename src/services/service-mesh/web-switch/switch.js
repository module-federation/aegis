'use strict'

import { nanoid } from 'nanoid'
import { hostname } from 'os'
import { Server, WebSocket } from 'ws'

const HOSTNAME = 'webswitch.local'
const SERVICENAME = 'webswitch'
const CLIENT_MAX_ERRORS = 3
const CLIENT_MAX_RETRIES = 10

const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const debug = /true/i.test(config.debug) || /true/i.test(process.env.DEBUG)
const isPrimary =
  /true/i.test(process.env.SWITCH) ||
  (typeof process.env.SWITCH === 'undefined' && config.isSwitch)
const headers = {
  host: 'x-webswitch-host',
  role: 'x-webswitch-role',
  pid: 'x-webswitch-pid'
}
let messagesSent = 0
let backupSwitch

/**
 * Attach {@link ServiceMeshAdapter} to the API listener socket.
 * way are using the service mesh, not the REST API. Use
 * key + cert in {@link secureCtx} for secure connection.
 * @param {https.Server|http.Server} httpServer
 * @param {tls.SecureContext} [secureCtx] if ssl enabled
 * @returns {import('ws').server}
 */
export function attachServer (httpServer, secureCtx = {}) {
  const info = Symbol('webswitch')
  /**
   * list of client connections (federation hosts, browsers, etc)
   * @type {Map<string,WebSocket>}
   */
  const clients = new Map()

  /**
   * WebSocket {@link server} that may serve as the webswitch.
   */
  const server = new Server({
    ...secureCtx,
    clientTracking: false,
    server: httpServer
  })

  server.binaryType = 'arraybuffer'

  function verifySignature (signature, data) {
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

  function signatureVerified (request) {
    //verifySignature(header, publicKey`)
    return true
  }

  /**
   *
   * @param {IncomingMessage} request
   * @returns
   */
  function foundHeaders (request) {
    const list = Object.values(headers)
    const node = list.filter(h => request.headers[h]).length === list.length
    const browser = request.headers['sec-websocket-protocol'] === 'webswitch'
    const accept = node || browser
    if (!accept)
      console.log(
        'reject connection from %s: missing protocol headers',
        request.socket.remoteAddress
      )
    return accept
  }

  function withinRateLimits (request) {
    return true
  }

  server.shouldHandle = request => {
    return (
      foundHeaders(request) &&
      signatureVerified(request) &&
      withinRateLimits(request)
    )
  }

  server.on('upgrade', (request, socket, head) => {
    server.handleUpgrade(request, socket, head, ws => {
      server.emit('connection', ws, request)
    })
  })

  server.on('connection', function (client, request) {
    initClient(client, request)

    client.on('error', function (error) {
      client[info].errors++

      console.error({
        fn: 'client.on(error)',
        client: client[info],
        error
      })

      if (client[info].errors > CLIENT_MAX_ERRORS) {
        console.warn('terminating client: too many errors')
        clients.delete(client[info].uniqueName)
        client.close(4500, 'too many errors')
      }
    })

    client.on('ping', () => client.pong())

    client.on('message', function (message) {
      debug && console.debug('switch received', { message })
      try {
        if (client[info].initialized) {
          handleEvent(client, message)
          return
        }
      } catch (e) {
        console.error(client.on.name, 'on message', e)
      }
      // bad protocol
      client.close(4403, 'bad request')
      client.terminate()
      console.warn('terminated client', client[info])
    })

    client.on('close', function (code, reason) {
      console.info({
        msg: 'client closing',
        code,
        reason: reason.toString(),
        client: client[info]
      })
      clients.delete(client[info]?.uniqueName)
      reassignBackup(client)
      broadcast(encode(statusReport()), client)
    })
  })

  function setClientInfo (client, request) {
    client[info] = {}
    client[info].id = nanoid()
    client[info].pid =
      request.headers[headers.pid] || Math.floor(Math.random() * 9999)
    client[info].host = request.headers[headers.host] || request.headers.host
    client[info].role = request.headers[headers.role] || 'browser'
    client[info].errors = 0
    client[info].lastUsed = 0
    client[info].uniqueName = client[info].host + client[info].pid
  }

  function initClient (client, request) {
    setClientInfo(client, request)

    if (clients.has(client[info].uniqueName)) {
      console.warn('found duplicate name', client[info].uniqueName)
      const oldClient = clients.get(client[info].uniqueName)
      oldClient.close(4040, client._socket.remotePort)
      oldClient.terminate()
    }
    client[info].initialized = true
    clients.set(client[info].uniqueName, client)
    console.info('client initialized', client[info])

    // make switch backup?
    assignBackup(client)

    // tell client if its now a backup switch or not
    publish(encode(client[info]), client)
    // tell everyone about new node (ignore browsers)
    if (client[info].role === 'node') publish(encode(statusReport()), client)
  }

  function handleEvent (client, message) {
    const event = decode(message)
    debug && console.debug('client received', message, event)

    if (event === 'status') {
      sendStatus(client)
      // get services and util stats
      return
    }
    if (event.eventName === 'telemetry') {
      updateTelemetry(client, event)
      return
    }
    // broadcast(message, client)
    routeMessage(message, client)
  }

  function publish (message, client = null, retries = 0) {
    if (!client) client = this
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
      messagesSent++
      return
    }
    if (retries.length < CLIENT_MAX_RETRIES)
      setTimeout(() => publish(message, client, ++retries), 2000)
  }

  WebSocket.prototype.publish = function (message) {
    publish.apply(this, message)
  }

  function leastRecentlyUsed (client1, client2) {
    const lru =
      client1[info].lastUsed > client2[info].lastUsed ? client2 : client1
    lru[info].lastUsed = Date.now()
    return lru
  }

  const noRoute = sender => {
    publish: msg => router.broadcast(msg, sender)
  }

  /**
   * These methods determine how messages are routed in the mesh.
   * If the message does not specify a method in the `route` field,
   * then the default method, broadcast, is used.
   */
  const router = {
    /**
     * Send to exactly one client running the service specified by `eventTarget`.
     * Rotate target hosts.
     */
    balanceEventTarget: (message, sender) =>
      clients
        .filter(
          client =>
            client !== sender &&
            client[info].services.includes(message.eventTarget)
        )
        .reduce(leastRecentlyUsed, noRoute(sender))
        .publish(message),
    /**
     * Send to all clients running the service specified by `eventTarget`.
     * @param {import('../../../domain').Event} message
     */
    broadcastEventTarget: (message, sender) =>
      clients
        .filter(
          client =>
            client !== sender &&
            client[info].services.includes(message.eventTarget)
        )
        .forEach(client => publish(message, client)),
    /**
     * Send to exactly one client that consumes the event in `message.eventName`.
     * Rotate clients.
     * @param {import('../../../domain').Event} message
     */
    balanceEventConsumer: (message, sender) =>
      clients
        .filter(
          client =>
            client !== sender && client[info].events.includes(message.eventName)
        )
        .reduce(leastRecentlyUsed, noRoute(sender))
        .publish(message),
    /**
     * Send to all clients that consume the event in `message.eventName`.
     * @param {import('../../../domain').Event} message
     */
    broadcastEventConsumer: (message, sender) =>
      clients
        .filter(
          client =>
            client !== sender && client[info].events.includes(message.eventName)
        )
        .forEach(client => publish(message, client)),
    /**
     * send to all clients
     * @param {import('../../../domain').Event} message
     */
    broadcast: (message, sender) => {
      clients.forEach(function (client) {
        if (client !== sender) publish(message, client)
      })
      router.uplink(message, sender)
    },

    /**
     * This is a response to a request. Send this to the
     * original requester, named in the field `requester`.
     *
     * @param {*} message
     * @param {*} sender
     */
    response: (message, sender) => {
      clients
        .find(client => sender.requester === client.uniqueName)
        .publish(message, sender)
    },

    /**
     * Send to the uplink for this network, if there is one.
     *
     * @param {*} message
     * @param {*} sender
     */
    uplink: (message, sender) => {
      if (server.uplink && server.uplink !== sender) {
        server.uplink.publish(message)
        messagesSent++
      }
    }
  }

  /**
   *
   * @param {import('../../../domain').Event} message
   * @param {*} client
   * @returns
   */
  function routeMessage (message, client) {
    const route = router[message.route]
    if (route) return route(message, client)
    return router.broadcast(message, client)
  }

  function encode (message) {
    return Buffer.from(JSON.stringify(message))
  }

  function decode (message) {
    return JSON.parse(Buffer.from(message).toString())
  }

  function assignBackup (client) {
    if (
      // Is this the primaary switch?
      isPrimary &&
      // is there a backup already?
      !backupSwitch &&
      client[info] &&
      // can't be a browser
      client[info].role === 'node' &&
      // dont run backup on same host
      client[info].hostname !== hostname()
    ) {
      backupSwitch = client[info]?.id
      console.info('new backup switch: ', client[info])
    }
  }

  function reassignBackup (client) {
    if (client[info]?.id === backupSwitch) {
      for (let cli of clients) {
        if (
          cli[info]?.role === 'node' &&
          cli[info].hostname !== hostname() &&
          cli[info].id !== backupSwitch
        ) {
          backupSwitch = cli[info].id
          cli[info].isBackupSwitch = true
          return
        }
      }
    }
  }

  function statusReport () {
    return {
      eventName: 'meshStatusReport',
      servicePlugin: SERVICENAME,
      uptimeMinutes: uptime(),
      messagesSent,
      clientsConnected: clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isPrimary,
      clients: [...clients.values()].map(v => ({
        ...v[info],
        state: v.readyState
      }))
    }
  }

  /**
   *
   * @param {WebSocket} client
   */

  function sendStatus (client) {
    console.debug('sending client status')
    publish(encode(statusReport()), client)
  }

  function updateTelemetry (client, msg) {
    if (!client[info]) return
    if (msg?.telemetry && client[info]) client[info].telemetry = msg.telemetry
    if (msg?.services && client[info]) client[info].services = msg.services
    if (msg?.events && client[info]) client[info].events = msg.events
    client[info].isBackupSwitch = backupSwitch === client[info].id
    console.log('updating telemetry', client[info])
  }

  // try {
  //   // configure uplink
  //   if (config.uplink) {
  //     const node = import('local/webswitch').then(node => {
  //       server.uplink = node
  //       node.serviceUrl = config.uplink
  //       node.onMessage(msg => routeMessage(msg, node))
  //       node.connect()
  //     })
  //   }
  // } catch (e) {
  //   console.error('uplink', e)
  // }

  return server
}

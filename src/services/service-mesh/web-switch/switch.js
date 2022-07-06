'use strict'

import { readCsrDomains } from 'acme-client/lib/crypto/forge'
import { Hash } from 'crypto'
import { Socket } from 'dgram'
import { nanoid } from 'nanoid'
import { hostname } from 'os'
import { Server } from 'ws'

const SERVICENAME = 'webswitch'
const CLIENT_MAX_ERRORS = 3
const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const debug = /true/i.test(config.debug)
const isSwitch = /true/i.test(process.env.IS_SWITCH) || config.isSwitch
let messagesSent = 0
let backupSwitch

/**
 * Attach {@link ServiceMeshAdapter} to the API listener socket.
 * Listen for upgrade events from http server and switch
 * client to WebSockets protocol. Clients connecting this
 * way are using the service mesh, not the REST API. Use
 * key + cert in {@link secureCtx} for secure connection.
 * @param {https.Server|http.Server} httpServer
 * @param {tls.SecureContext} [secureCtx] if ssl enabled
 * @returns {import('ws').server}
 */
export function attachServer (httpServer, secureCtx = {}) {
  /**
   * list of client connections (federation hosts, browsers, etc)
   * @type {Set<WebSocket>}
   */
  const clients = new Set()

  /**
   * WebSocket {@link server} that may serve as the webswitch.
   */
  const server = new Server({
    ...secureCtx,
    clientTracking: false,
    server: httpServer
  })

  /**w
   *
   * @param {{request:Request, socket:Socket, head}} evidence
   */
  async function protocolRules ({ request, socket }) {
    const payload = await request.json()

    const rules = {
      wrongName: () => payload.proto !== SERVICENAME,
      duplicate: () =>
        [...clients.values()].filter(
          client =>
            client.address === socket.remoteAddress().address &&
            (client.role === payload.role) === 'node'
        ).length > 0
    }
    const broken = thisRule => rules[thisRule]()
    return Promise.race(Object.keys(rules).some(broken))
  }

  server.on('upgrade', async (request, socket, head) => {
    // const broken = await protocolRules({ request, socket, head })

    // if (broken) {
    //   console.warn('bad request')
    //   socket.destroy()
    //   return
    // }
    server.handleUpgrade(request, socket, head, ws =>
      server.emit('connection', ws, request)
    )
  })

  server.broadcast = function (data, sender) {
    clients.forEach(function (client) {
      if (client.readyState === WebSocket.OPEN && client !== sender) {
        console.assert(!DEBUG, 'sending client', client.info, data.toString())
        client.send(data)
        messagesSent++
      }
    })

    if (server.uplink && server.uplink !== sender) {
      server.uplink.publish(data)
      messagesSent++
    }
  }

  /**
   * @todo implement rate limit enforcement
   * @param {WebSocket} client
   */
  server.setRateLimit = function (client) {}

  function statusReport () {
    return JSON.stringify({
      eventName: 'meshStatusReport',
      servicePlugin: SERVICENAME,
      uptimeMinutes: uptime(),
      messagesSent,
      clientsConnected: clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      clients: [...clients].map(c => ({ ...c.info, open: c.OPEN }))
    })
  }

  /**
   *
   * @param {WebSocket} client
   */
  server.sendStatus = function (client) {
    client.send(statusReport())
  }

  server.reassignBackupSwitch = function (client) {
    if (client.info?.id === backupSwitch) {
      for (let clnt of clients) {
        if (clnt.info.role === 'node' && clnt.info.id !== backupSwitch) {
          backupSwitch = clnt.info.id
          clnt.isBackupSwitch = true
          return
        }
      }
    }
  }

  function setClientInfo (client, msg = {}, initialized = true) {
    if (typeof client.info === 'undefined') client.info = {}

    if (!client.info.id) client.info.id = nanoid()
    if (msg?.role) client.info.role = msg.role
    if (msg?.hostname) client.info.hostname = msg.hostname
    if (msg?.mem && msg?.cpu) client.info.telemetry = { ...msg.mem, ...msg.cpu }
    if (msg?.apps) client.info.apps = msg.apps
    if (msg?.proto)
      client.info.initialized = msg.proto === SERVICENAME ? true : initialized
    client.info.isBackupSwitch = backupSwitch === client.info.id
  }

  /**
   * @param {WebSocket} client
   */
  server.on('connection', function (client) {
    setClientInfo(client, null, false)

    client.on('close', function (code, reason) {
      console.info({
        msg: 'client closing',
        code,
        reason: reason.toString(),
        client: client.info
      })
      clients.delete(client)
      server.broadcast(statusReport())
      server.reassignBackupSwitch(client)
    })

    client.on('error', function (error) {
      client.info.errors++

      console.error({
        fn: 'client.on(error)',
        client: client.info,
        error
      })

      if (client.info.errors > CLIENT_MAX_ERRORS) {
        console.warn('terminating client: too many errors')
        client.close(4888, 'too many errors')
      }
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.info.initialized) {
          if (msg == 'status') {
            setClientInfo(client, msg)
            server.sendStatus(client)
            return
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME) {
          setClientInfo(client, msg, true)
          clients.add(client)

          // if a backup switch is needed, is the client eligible?
          if (
            // are we the switch?
            isSwitch &&
            // is there a backup already?
            !backupSwitch &&
            // can't be a browser
            msg.role === 'node' &&
            // don't put backup on same host
            msg.hostname !== hostname()
          ) {
            backupSwitch = client.info.id
            console.info('new backup switch: ', id)
          }

          console.info('client initialized', client.info)
          // tell client if its a backup switch or not
          client.send(JSON.stringify(client.info))
          // tell everyone about new node (ignore browser)
          if (client.info.role === 'node')
            server.broadcast(statusReport(), client)
          return
        }
      } catch (e) {
        console.error(client.on.name, 'on message', e)
      }

      // bad protocol
      client.terminate()
      console.warn('terminated client', client.info)
    })
  })

  try {
    // configure uplink
    if (config.uplink) {
      const node = require('./node')
      server.uplink = node
      node.setUplinkUrl(config.uplink)
      node.onUplinkMessage(msg => server.broadcast(msg, node))
      node.connect()
    }
  } catch (e) {
    console.error('uplink', e)
  }

  return server
}

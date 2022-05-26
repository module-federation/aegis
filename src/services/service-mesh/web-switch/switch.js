'use strict'

import { nanoid } from 'nanoid'
import { hostname } from 'os'

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
 *
 * @param {import('ws').Server} server
 * @returns {import('ws').Server}
 */
export function attachServer (server) {
  /**
   * @param {object} data
   * @param {WebSocket} sender
   */
  server.broadcast = function (data, sender) {
    server.clients.forEach(function (client) {
      if (client.OPEN && client !== sender) {
        console.assert(!debug, 'sending client', client.info, data.toString())
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
      clientsConnected: server.clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      clients: [...server.clients].map(c => ({ ...c.info, open: c.OPEN })),
      debug
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
    if (client.info.id === backupSwitch) {
      for (let c of server.clients) {
        if (c.info.id !== backupSwitch) {
          backupSwitch = c.info.id
          c.isBackupSwitch = true
          return
        }
      }
    }
  }

  /**
   * @param {WebSocket} client
   */
  server.on('connection', function (client) {
    const clientAddress = client._socket.address()
    const clientId = nanoid()

    client.addListener('ping', function () {
      console.assert(!debug, 'responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function () {
      console.warn('client disconnecting', client.info)
      server.reassignBackupSwitch(client)
      server.broadcast(statusReport(), client)
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
        client.terminate()
      }
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.info?.initialized) {
          if (msg == 'status') {
            server.sendStatus(client)
            return
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME) {
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
            backupSwitch = clientId
            console.info('new backup switch: ', clientId)
          }

          client.info = {
            ...msg,
            initialized: true,
            isBackupSwitch: backupSwitch === clientId,
            id: clientId,
            address: clientAddress,
            errors: 0
          }

          console.info('client initialized', client.info)
          // tell client if its a backup switch or not
          client.send(JSON.stringify({ ...msg, ...client.info }))
          // tell everyone about new client
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

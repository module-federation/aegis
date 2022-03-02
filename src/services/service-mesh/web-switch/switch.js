'use strict'

import { nanoid } from 'nanoid'
import os from 'os'

const SERVICENAME = 'webswitch'
const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const DEBUG = /true/i.test(config.debug)
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
      clientsConnected: server.clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      hostname: os.hostname(),
      clients: [...server.clients].map(c => ({ ...c.info, open: c.OPEN }))
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
        if (c.info.id !== backupSwitch && os.hostname() !== c.info.hostname) {
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
    client.info = { address: client._socket.address(), id: nanoid() }

    client.addListener('ping', function () {
      console.assert(!DEBUG, 'responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function () {
      console.warn('client disconnecting', client.info)
      server.reassignBackupSwitch(client)
      server.broadcast(statusReport(), client)
    })

    client.on('error', function (error) {
      console.error(error)
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.info.initialized) {
          if (msg == 'status') {
            server.sendStatus(client)
            return
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME) {
          if (
            isSwitch &&
            !backupSwitch &&
            msg.role === 'node' &&
            msg.hostname !== os.hostname()
          )
            backupSwitch = client.info.id

          client.info = {
            ...msg,
            initialized: true,
            isBackupSwitch: backupSwitch === client.info.id
          }
          console.info('client initialized', client.info)

          client.send(JSON.stringify({ ...msg, ...client.info }))
          return
        }
      } catch (e) {
        console.error(client.on.name, 'on message', e)
      }

      client.terminate()
      console.warn('terminated client', client.info)
    })
  })

  try {
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

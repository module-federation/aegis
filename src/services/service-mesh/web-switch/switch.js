'use strict'

import e from 'express'
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
      hostname: hostname(),
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      clients: [...server.clients].map(c => ({
        ...c.info,
        open: c.readyState === c.OPEN
      })),
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
    if (client.info?.id === backupSwitch) {
      for (let c of server.clients) {
        if (c.info?.id !== backupSwitch) {
          backupSwitch = c.info.id
          c.isBackupSwitch = true
          return
        }
      }
    }
  }

  function deleteDuplicateClient (client, hostname) {
    const prevClient = [...server.clients].find(
      c => c.info.hostname === hostname
    )

    console.warn({
      msg: 'deleting previous connection to client',
      client: prevClient.info
    })

    if (prevClient) prevClient.close(8008)
    server.clients.delete(prevClient)
  }

  function setClientInfo (client, msg = {}, initialized = true) {
    if (typeof client.info === 'undefined') client.info = {}
    if (!client.info.id) client.info.id = nanoid()
    if (typeof client.info.errors === 'undefined') client.info.errors = 0
    if (typeof client.info.role === 'undefined' && msg?.role)
      client.info.role = msg.role
    if (typeof client.info.hostname === 'undefined' && msg?.hostname)
      client.info.hostname = msg.hostname
    if (msg?.mem && msg?.cpu)
      client.info.telemetry = { ...msg?.mem, ...msg?.cpu }
    if (msg?.apps) client.info.apps = msg.apps
    client.info.initialized = initialized
    client.info.isBackupSwitch = backupSwitch === client.info.id
  }

  /**
   * @param {WebSocket} client
   */
  server.on('connection', function (client) {
    setClientInfo(client, null, false)

    client.addListener('ping', function () {
      console.assert(!debug, 'responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function (code) {
      if (code === 8007) console.info('client reloading', client.info)
      else {
        console.warn('client disconnecting', client.info)
        server.broadcast(statusReport(), client)
      }
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
        client.terminate()
      }
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())
        deleteDuplicateClient(client, msg.hostname)

        if (client.info.initialized) {
          if (msg == 'status') {
            setClientInfo(client, msg)
            server.sendStatus(client)
            return
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME && msg.role) {
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
          setClientInfo(client, msg)

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

'use strict'

/** @module */

import { nanoid } from 'nanoid'
import os from 'os'
import Dns from 'multicast-dns'
import CircuitBreaker from '../../../domain/circuit-breaker'

const SERVICENAME = 'webswitch'
const HOSTNAME = 'webswitch.local'
const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const debug = /true/i.test(config.debug)

let isSwitch = typeof config.isSwitch === 'undefined' ? true : config.isSwitch
let isBackupSwitch = !isSwitch && config.isBackupSwitch
let activateBackup = false
let backupSwitch = null
let messagesSent = 0

function calculatePriority () {
  return isSwitch || (isBackupSwitch && activateBackup) ? 10 : 20
}

function calculateWeight () {
  return isSwitch || (isBackupSwitch && activateBackup) ? 20 : 60
}

/**
 *
 * @param {import('ws').Server} server
 * @returns {import('ws').Server}
 */
export function attachServer (server) {
  /**
   * @param {object} message
   * @param {WebSocket} sender
   */
  server.broadcast = function (message, sender) {
    server.clients.forEach(function (client) {
      if (client.OPEN && client !== sender) {
        console.assert(
          !debug,
          'sending client',
          client.info,
          message.toString()
        )
        server.sendMessage(message, client)
        messagesSent++
      }
    })

    if (server.uplink && server.uplink !== sender) {
      server.sendUplinkMessage(message)
      messagesSent++
    }
  }

  server.sendMessage = function (message, client) {
    const breaker = new CircuitBreaker(client.info.id, client.send)
    breaker.invoke(message)
  }

  server.sendUplinkMessage = function (message) {
    const breaker = new CircuitBreaker('uplink', server.uplink.publish)
    breaker.invoke(message)
  }

  /**
   * @todo implement rate limit enforcement
   * @param {WebSocket} client
   */
  server.setRateLimit = function (client) {}

  /**
   * @returns {object} status
   */
  function reportStatus () {
    return JSON.stringify({
      eventName: 'meshStatusReport',
      servicePlugin: SERVICENAME,
      uptimeMinutes: uptime(),
      messagesSent,
      clientsConnected: server.clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      isBackupSwitch,
      hostname: os.hostname(),
      address: server.address().address,
      port: server.address().port,
      clients: [...server.clients].map(client => client.info),
      metaEvent: true
    })
  }

  /**
   *
   * @param {WebSocket} client
   */
  server.sendStatus = function (client) {
    client.send(reportStatus())
  }

  server.reassignBackupSwitch = function (client) {
    if (client.info.id === backupSwitch) {
      for (let c of server.clients) {
        if (
          c.info.id !== backupSwitch &&
          os.hostname() !== c.info.hostname &&
          c.info.role === 'node'
        ) {
          backupSwitch = c.info.id
          c.info.isBackupSwitch = true
          c.send(c.info) // notify
          return
        }
      }
    }
  }

  /**
   * @param {WebSocket} client
   */
  server.on('connection', function (client) {
    client.info = { id: nanoid() }

    client.addListener('ping', function () {
      console.assert(!debug, 'responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function () {
      console.warn('client disconnecting', client.info)
      server.reassignBackupSwitch(client)
      server.broadcast(reportStatus(), client)
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
          if (msg == 'retask') {
            isSwitch = true
            return
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME) {
          // if there's currently no backup and this client qualifies...
          if (
            isSwitch &&
            !backupSwitch &&
            msg.role === 'node' &&
            msg.hostname !== os.hostname() &&
            [...server.clients].filter(c => c.info.isBackupSwitch).length < 1
          ) {
            // ...make it the new backup switch
            backupSwitch = client.info.id
          }

          client.info = {
            ...msg,
            ...client.info,
            initialized: true,
            isBackupSwitch: backupSwitch === client.info.id,
            backupPriority: 'low',
            switchHost: os.hostname()
          }
          console.info('client initialized', client.info)

          // respond and let it know if its a new backup switch
          client.send(
            JSON.stringify({ ...msg, ...client.info, metaEvent: true })
          )
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
    // connect to the uplink switch
    if (config.uplink) {
      // we are now both a switch and a node
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

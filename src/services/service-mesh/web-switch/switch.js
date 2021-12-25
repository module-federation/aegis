'use strict'

import { nanoid } from 'nanoid'

const SERVICENAME = 'webswitch'
const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const uplink = configRoot.services.serviceMesh.WebSwitch.uplink
const DEBUG = /true/i.test(configRoot.services.serviceMesh.WebSwitch.debug)
const isSwitch = /true/i.test(process.env.IS_SWITCH) || config.isSwitch
let messagesSent = 0

/**
 *
 * @param {import('ws').Server} server
 * @returns {import('ws').Server}
 */
export function attachServer (server) {
  /**
   *
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
   * @todo
   * @param {WebSocket} client
   */
  server.setRateLimit = function (client) {}

  /**
   *
   * @param {WebSocket} client
   */
  server.sendStatus = function (client) {
    client.send(
      JSON.stringify({
        servicePlugin: SERVICENAME,
        uptimeMinutes: uptime(),
        messagesSent,
        clientsConnected: server.clients.size,
        uplink: server.uplink ? uplink : 'no uplink',
        primarySwitch: isSwitch,
        failoverSwitch: server.failoverSwitch,
        clients: {
          ...server.clients.info
        }
      })
    )
  }

  // function setFailoverSwitch (client) {
  //   const clients = server.clients.entries()

  //   function _setFailoverSwitch (client) {
  //     if (!server.failoverSwitch) {
  //       if (client.OPEN) {
  //         client.send({ proto: SERVICENAME, msg: 'setFailover' })
  //         return true
  //       }
  //       if (_setFailoverSwitch(clients.next().value)) return true
  //     }
  //     return false
  //   }

  //   _setFailoverSwitch(client)
  // }

  /**
   * @param {WebSocket} client
   */
  server.on('connection', function (client) {
    client.info = { address: client._socket.address(), id: nanoid() }
    //setFailoverSwitch(client)

    client.addListener('ping', function () {
      console.assert(!DEBUG, 'responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function () {
      console.warn('client disconnecting', client.info)
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.info.initialized) {
          if (msg == 'status') {
            return server.sendStatus(client)
          }

          server.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME && msg.pid && msg.role) {
          client.info = {
            ...msg,
            initialized: true
          }
          console.info('client initialized', client.info)
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
    if (uplink) {
      server.uplink = require('./node')
      server.uplink.setUplinkAddress(uplink)
      server.uplink.onUplinkMessage(msg => server.broadcast(msg, server.uplink))
      server.uplink.info = {
        id: nanoid(),
        pid: process.pid,
        role: 'uplink',
        initialized: true
      }
      server.uplink.publish({
        proto: SERVICENAME,
        ...server.uplink.info
      })
    }
  } catch (e) {
    console.error('uplink', e)
  }

  return server
}

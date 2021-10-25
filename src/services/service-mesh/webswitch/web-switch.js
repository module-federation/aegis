'use strict'

import { nanoid } from 'nanoid'
const uplink = process.env.WEBSWITCH_UPLINK
const begins = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - begins) / 1000 / 60))
const DEBUG = /true/i.test(process.env.WEBSWITCH_DEBUG)
let messagesSent = 0

/**
 *
 * @param {import('ws').Server} server
 */
export function attachServer (server) {
  /**
   *
   * @param {object} data
   * @param {WebSocket} sender
   */
  server.broadcast = function (data, sender) {
    server.clients.forEach(function (client) {
      if (client.OPEN && client.info.id !== sender.info.id) {
        !DEBUG || console.debug('sending client', client.info, data.toString())

        client.send(data)
        messagesSent++
      }
    })

    if (server.uplink && server.uplink.info.id !== sender.info.id) {
      server.uplink.publishEvent(data)
      messagesSent++
    }
  }

  /**
   * @todo
   * @param {*} client
   */
  server.setRateLimit = function (client) {}

  server.sendStatus = function (client) {
    client.send(
      JSON.stringify({
        uptimeMinutes: uptime(),
        messagesSent,
        clientsConnected: server.clients.size,
        uplink: server.uplink ? uplink : 'no uplink'
      })
    )
  }

  server.on('connection', function (client) {
    client.info = { address: client._socket.address(), id: nanoid() }

    client.addListener('ping', function () {
      !DEBUG || console.debug('responding to client ping', client.info)
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

        if (msg.proto === 'webswitch' && msg.pid && msg.role) {
          client.info = {
            ...client.info,
            pid: msg.pid,
            role: msg.role,
            initialized: true
          }
          console.log('client initialized', client.info)
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
      server.uplink = require('./web-node')
      server.uplink.info = { id: nanoid(), role: 'uplink' }
      server.uplink.setDestinationHost(uplink)
      server.uplink.onMessage(msg => server.broadcast(msg, server.uplink))
      server.uplink.publishEvent({
        proto: 'webswitch',
        pid: process.pid,
        role: 'uplink'
      })
    }
  } catch (e) {
    console.error('uplink', e)
  }
}

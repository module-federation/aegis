'use strict'

const WebSocketServer = require('ws').Server
const nanoid = require('nanoid').nanoid
const uplink = process.env.WEBSWITCH_UPLINK
const heartb = process.env.WEBSWITCH_HEARTB || 30000
const begins = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - begins) / 1000 / 60))
let messagesSent = 0

/**
 *
 * @param {WebSocketServer} server
 */
exports.attachServer = function (server) {
  /**
   *
   * @param {object} data
   * @param {WebSocket} sender
   */
  server.broadcast = function (data, sender) {
    server.clients.forEach(function (client) {
      if (
        client.OPEN &&
        client.webswitchId !== sender.webswitchId &&
        (client.processId !== process.pid ||
          client._socket.address().address.contains(server.options.host))
      ) {
        console.debug('sending to client', client.webswitchId)
        client.send(data)
        messagesSent++
      }
    })

    if (server.uplink && server.uplink.webswitchId !== sender.webswitchId) {
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
        uplink: server.uplink
          ? {
              id: server.uplink.webswitchId,
              address: server.uplink._socket.address()
            }
          : 'no uplink'
      })
    )
  }

  server.on('connection', function (client) {
    client.webswitchId = nanoid()

    console.log('client connected', {
      id: client.webswitchId,
      address: client._socket.address()
    })

    client.addListener('ping', function () {
      client.pong()
    })

    client.on('close', function () {
      console.warn('client disconnected', {
        id: client.webswitchId,
        address: client._socket.address()
      })
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        console.debug('received client msg:', msg)
        if (client.webswitchInit) {
          if (msg == 'status') {
            return server.sendStatus(client)
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === 'webswitch' && msg.pid) {
          client.processId = msg.pid
          client.send(JSON.stringify({ proto: 'webswitch', pid: process.pid }))
          console.log('client initialized', {
            id: client.webswitchId,
            pid: client.processId,
            address: client._socket.address()
          })
          client.webswitchInit = true
          return
        }
      } catch (e) {
        console.error(e)
      }

      client.terminate()
      console.log('terminated client', client.webswitchId)
    })
  })

  if (uplink) {
    server.uplink = require('./web-node')
    server.uplink.webswitchId = nanoid()
    server.uplink.setDestinationHost(uplink)
    server.uplink.onMessage(msg => server.broadcast(msg, server.uplink))
    server.uplink.publishEvent({ proto: 'webswitch', pid: process.pid })
  }
}

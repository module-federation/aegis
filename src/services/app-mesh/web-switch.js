'use strict'

const WebSocketServer = require('ws').Server
const nanoid = require('nanoid').nanoid
const uplink = process.env.WEBSWITCH_UPLINK
const heartb = process.env.WEBSWITCH_HEARTBEATMS || 30000
const starts = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - starts) / 1000 / 60))
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
      if (client.OPEN && client.webswitchId !== sender.webswitchId) {
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
          ? server.uplink.url || server.uplink.webswitchId
          : 'no uplink'
      })
    )
  }

  // setInterval(() =>
  //   server.clients.forEach(client => server.sendStatus(client), heartb)
  // )

  server.on('connection', function (client) {
    client.webswitchId = nanoid()
    console.log('client connected', client.webswitchId)

    client.addListener('ping', function () {
      client.pong()
    })

    client.on('close', function () {
      console.warn('client disconnected', client.webswitchId)
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.webswitchInit) {
          if (msg == 'status') {
            return server.sendStatus(client)
          }
          server.broadcast(message, client)
          return
        }

        if (msg === 'webswitch') {
          console.log('client initialized')
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
    server.uplink.publishEvent('webswitch')
  }
}

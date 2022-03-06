'use strict'

import { nanoid } from 'nanoid'
import os from 'os'
import Dns from 'multicast-dns'

const SERVICENAME = 'webswitch'
const HOSTNAME = 'webswitch.local'
const startTime = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60))
const configRoot = require('../../../config').hostConfig
const config = configRoot.services.serviceMesh.WebSwitch
const debug = /true/i.test(config.debug)

let isSwitch = config.isSwitch || /true/i.test(process.env.IS_SWITCH)
let isBackupSwitch
let activateBackup
let messagesSent = 0
let backupSwitch

/**
 *
 * @param {import('ws').Server} server
 * @returns {import('ws').Server}
 */
export function attachServer (server) {
  const dns = new Dns()

  dns.on('query', function (query) {
    debug && console.debug('got a query packet:', query)

    const questions = query.questions.filter(
      q => q.name === SERVICENAME || q.name === HOSTNAME
    )

    if (!questions[0]) {
      console.debug({ fn: dns.on.name, msg: 'no questions', questions })
      return
    }

    if (isSwitch || (isBackupSwitch && activateBackup)) {
      const answer = {
        answers: [
          {
            name: SERVICENAME,
            type: 'SRV',
            data: {
              port: server.address().port,
              weight: 0,
              priority: 10,
              target: server.address().address
            }
          }
        ]
      }

      console.info({
        fn: dns.on.name + "('query')",
        isSwitch,
        isBackupSwitch,
        activateBackup,
        msg: 'answering query packet',
        questions,
        answer
      })

      dns.respond(answer)
    }
  })

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
      isBackupSwitch: !isSwitch && isBackupSwitch,
      hostname: os.hostname(),
      address: server.address().address,
      port: server.address().port,
      clients: [...server.clients].map(client => client.info)
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
      console.assert(!debug, 'responding to client ping', client.info)
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
          if (msg == 'retask') {
            isSwitch = true
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
            ...client.info,
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

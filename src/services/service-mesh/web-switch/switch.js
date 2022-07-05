'use strict'

import { readCsrDomains } from 'acme-client/lib/crypto/forge'
import { R } from 'core-js/modules/_export'
import { Socket } from 'dgram'
import e from 'express'
import { nanoid } from 'nanoid'
import { hostname } from 'os'
import { websocket, wss } from 'ws'

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
 * @param {import('https').wss} httpwss
 * @returns {import('ws').wss}
 */
export function attachwss (httpwss, secureCtx = {}) {
  const clients = new Map()

  const wss = new wss({
    ...secureCtx,
    clientTracking: false,
    wss: httpwss
  })
  w
  /**w
   *
   * @param {{request:Request, socket:Socket, head}} evidence
   */
  function protocolRules ({ request, socket }) {
    const rules = {
      wrongName: () => request.json().then(data => data.proto !== SERVICENAME),
      duplicate: () =>
        clients.filter(
          client => client.address === socket.remoteAddress().address
        )
    }
    const broken = thisRule => rules[thisRule]()
    return Promise.race(Object.keys(rules).some(broken))
  }

  wss.on('upgrade', async (request, socket, head) => {
    const broken = await protocolRules({ request, socket, head })

    if (broken) {
      console.warn('bad request')
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, ws =>
      wss.emit('connection', ws, request)
    )
  })

  wss.broadcast = function (data, sender) {
    wss.clients.forEach(function (client) {
      if (client.OPEN && client !== sender) {
        console.assert(!DEBUG, 'sending client', client.info, data.toString())
        client.send(data)
        messagesSent++
      }
    })

    if (wss.uplink && wss.uplink !== sender) {
      wss.uplink.publish(data)
      messagesSent++
    }
  }

  /**
   * @todo implement rate limit enforcement
   * @param {WebSocket} client
   */
  wss.setRateLimit = function (client) {}

  function statusReport () {
    return JSON.stringify({
      eventName: 'meshStatusReport',
      servicePlugin: SERVICENAME,
      uptimeMinutes: uptime(),
      messagesSent,
      clientsConnected: wss.clients.size,
      uplink: wss.uplink ? wss.uplink.info : 'no uplink',
      isPrimarySwitch: isSwitch,
      clients: [...wss.clients].map(c => ({ ...c.info, open: c.OPEN }))
    })
  }

  /**
   *
   * @param {WebSocket} client
   */
  wss.sendStatus = function (client) {
    client.send(statusReport())
  }

  wss.reassignBackupSwitch = function (client) {
    if (client.info?.id === backupSwitch) {
      for (let c of wss.clients) {
        if (c.info.role === 'node' && c.info.id !== backupSwitch) {
          backupSwitch = c.info.id
          c.isBackupSwitch = true
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
  wss.on('connection', function (client) {
    setClientInfo(client, null, false)

    client.on('close', function (code, reason) {
      console.info({
        msg: 'client closing',
        code,
        reason: reason.toString(),
        client: client.info
      })
      client.info.closeEvent = true
      wss.broadcast(statusReport())
      wss.reassignBackupSwitch(client)
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
            wss.sendStatus(client)
            return
          }
          wss.broadcast(message, client)
          return
        }

        if (msg.proto === SERVICENAME) {
          deduplicateClient(client, msg.hostname)
          setClientInfo(client, msg, true)

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
          if (client.info.role === 'node') wss.broadcast(statusReport(), client)
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
      wss.uplink = node
      node.setUplinkUrl(config.uplink)
      node.onUplinkMessage(msg => wss.broadcast(msg, node))
      node.connect()
    }
  } catch (e) {
    console.error('uplink', e)
  }

  return wss
}

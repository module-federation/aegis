/**
 * WEBSWITCH (c)
 *
 * websocket clients connect to a common ws server
 * (called the switch) which broadcasts messages
 * to the other connected clients as well as the
 * uplink if one is configured.
 */
'use strict'

import os from 'os'
import WebSocket from 'ws'
import makeMdns from 'multicast-dns'

const SERVICENAME = 'webswitch'
const HOSTNAME = 'webswitch.local'
const MAXRETRY = 5
const TIMEOUTEVENT = 'webswitchTimeout'
const configRoot = require('../../../config').aegisConfig
const config = configRoot.services.serviceMesh.WebSwitch
const DEBUG = /true|yes|y/i.test(config.debug) || false
const heartbeat = config.heartbeat || 10000
const protocol = /true/i.test(process.env.SSL_ENABLED) ? 'wss' : 'ws'

let serviceUrl
let uplinkCallback
/** @type {import('../../../domain/observer').Observer} */
let observer
/**@type {import('../../../domain/model-factory').ModelFactory} */
let models
/** @type {import('ws/lib/websocket')}*/
let ws

if (!configRoot) console.error('WebSwitch', 'cannot access config file')

function getLocalAddress () {
  const interfaces = os.networkInterfaces()
  const addresses = []
  for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
      const address = interfaces[k][k2]
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address)
      }
    }
  }
  return addresses
}
/**
 * Use multi-cast DNS to find the Aegis
 * instance configured as the switch for
 * the local network.
 *
 * @returns {Promise<string>} url
 */
async function resolveServiceUrl () {
  const mdns = makeMdns()
  let url

  return new Promise(async function (resolve) {
    mdns.on('response', function (response) {
      DEBUG && console.debug('got a response packet:', response)

      const answer = response.answers.find(
        a => a.name === SERVICENAME && a.type === 'SRV'
      )

      if (answer) {
        url = `${protocol}://${answer.data.target}:${answer.data.port}`
        console.info('found dns service record for', SERVICENAME, url)
        resolve(url)
      }
    })

    mdns.on('query', function (query) {
      DEBUG && console.debug('got a query packet:', query)

      const questions = query.questions.filter(
        q => q.name === SERVICENAME || q.name === HOSTNAME
      )

      if (questions[0]) {
        if (os.hostname === HOSTNAME || config.isSwitch === true) {
          console.debug('answering question about', HOSTNAME)
          mdns.respond({
            answers: [
              {
                name: SERVICENAME,
                type: 'SRV',
                data: {
                  port: config.port,
                  weight: 0,
                  priority: 10,
                  target: config.host
                }
              },
              {
                name: HOSTNAME,
                type: 'A',
                ttl: 300,
                data: getLocalAddress()[0]
              }
            ]
          })
        }
      }
    })

    /**
     * Query DNS for the webswitch server.
     * Recursively retry by incrementing a
     * counter we pass to ourselves on the
     * stack.
     *
     * @param {number} attempts number of query attempts
     * @returns
     */
    function runQuery (attempts = 0) {
      if (attempts > MAXRETRY) {
        console.warn('mDNS cannot find switch after max retries')
        return
      }
      // lets query for an A record
      mdns.query({
        questions: [
          {
            name: HOSTNAME,
            type: 'A'
          }
        ]
      })

      setTimeout(() => (url ? resolve(url) : runQuery(attempts++)), 6000)
    }

    runQuery()
  })
}

/**
 * Set callback for uplink.
 * @param {function():Promise<void>} callback
 */
export function onUplinkMessage (callback) {
  uplinkCallback = callback
}

/**
 * server sets uplink host
 */
export function setUplinkUrl (uplinkUrl) {
  serviceUrl = uplinkUrl
  ws = null // trigger reconnect
  connect()
}

/**
 * @typedef {object} HandshakeMsg
 * @property {string} proto the protocol 'webswitch'
 * @property {'node'|'browser'|'uplink'} role of the client
 * @property {number} pid - processid of the client or 1 for browsers
 * @property {string} serviceUrl - webswitch url for the client
 * @property {string[]} models - names of models running on the instance
 * @property {string} address - address of the client
 * @property {string} url - url to connect to client instance directly
 */

/**
 *
 */
const handshake = {
  /**
   *
   * @returns {HandshakeMsg}
   */
  clientInfo () {
    return {
      proto: SERVICENAME,
      role: 'node',
      pid: process.pid,
      serviceUrl,
      models: models.getModelSpecs().map(spec => spec.modelName),
      address: getLocalAddress()[0],
      url: `${protocol}://${config.host}:${config.port}`
    }
  },
  validate (eventData) {
    return eventData.proto === SERVICENAME && eventData.pid
  },
  serialize () {
    return JSON.stringify(this.clientInfo())
  }
}

/**
 *
 * @param {WebSocket} ws
 */
function startHeartBeat (ws) {
  let receivedPong = false

  ws.addListener('pong', function () {
    console.assert(!DEBUG, 'received pong')
    receivedPong = true
  })

  ws.ping(0x9)

  const intervalId = setInterval(async function () {
    if (receivedPong) {
      receivedPong = false
      ws.ping(0x9)
    } else {
      try {
        observer.notify(TIMEOUTEVENT, 'server unresponsive', true)
        console.error('mesh server unresponsive, trying new connection')
        clearInterval(intervalId)
        await reconnect()
      } catch (error) {
        console.error(startHeartBeat.name, error)
      }
    }
  }, heartbeat)
}

/**
 * @callback subscription
 * @param {{
 *  eventName:string,
 *  model:import('../../../domain/index').Model
 * }} eventData
 */

/**
 * @param {*} eventName
 * @param {subscription} callback
 * @param {*} observer
 * @param {{allowMultiple:boolean, once:boolean}} [options]
 */
export async function subscribe (eventName, callback, options = {}) {
  try {
    observer.on(eventName, callback, options)
  } catch (e) {
    console.error('subscribe', e)
  }
}

async function connect () {
  if (!ws) {
    if (!serviceUrl) serviceUrl = await resolveServiceUrl()
    console.info('connecting to ', serviceUrl)
    ws = new WebSocket(serviceUrl)

    ws.on('open', function () {
      ws.send(handshake.serialize())
      startHeartBeat(ws)
    })

    ws.on('error', function (error) {
      console.error(ws.on, 'opening new conn after error', error)
      ws = null
    })

    ws.on('message', async function (message) {
      const eventData = JSON.parse(message)
      console.assert(!DEBUG, 'received event:', eventData)

      if (eventData.eventName) {
        await observer.notify(eventData.eventName, eventData)
        if (uplinkCallback) await uplinkCallback(message)
        return
      }

      if (handshake.validate(eventData)) {
        ws.send(handshake.serialize())
        return
      }

      console.warn('no eventName in eventData', eventData)
    })
  }
}

async function reconnect () {
  serviceUrl = null
  ws = null
  await connect()
}

function send (event) {
  if (ws?.readyState) {
    ws.send(JSON.stringify(event))
    return
  }
  setTimeout(send, 1000)
}

/**
 * Call this method to broadcast a message on the webswitch network
 * @param {object} event
 * @returns
 */
export async function publish (event) {
  try {
    if (!event) {
      console.error(publish.name, 'no event provided')
      return
    }
    await connect()
    send(event)
  } catch (e) {
    console.error('publish', e)
  }
}

/**
 *
 * @param {{
 *  observer:import('../../../domain/observer').Observer,
 *  models:import('../../../domain/model-factory').ModelFactory
 * }} serviceInfo
 */
export const initialize = async serviceInfo => {
  observer = serviceInfo.observer
  models = serviceInfo.models
  await connect()
}

/**
 * webswitch (c)
 *
 * websocket clients connect to a common ws server
 * (called a web-switch) which broadcasts messages
 * to the other connected clients as well as an
 * uplink if one is configured.
 */
'use strict'

import os from 'os'
import WebSocket from 'ws'
import Dns from 'multicast-dns'

const SERVICENAME = 'webswitch'
const HOSTNAME = 'webswitch.local'
const TIMEOUTEVENT = 'webswitchTimeout'
const configRoot = require('../../../config').hostConfig
const domain = configRoot.services.cert.domain || process.env.DOMAIN
const config = configRoot.services.serviceMesh.WebSwitch
const DEBUG = config.debug || /.*/i.test(process.env.DEBUG)
const heartbeat = config.heartbeat || 10000
const isSwitch = /true/i.test(process.env.IS_SWITCH) || config.isSwitch
const protocol = /true/i.test(process.env.SSL_ENABLED) ? 'wss' : 'ws'
const sslPort = /true/i.test(process.env.SSL_PORT) || 443
const port = /true/i.test(process.env.PORT) || 80
const servicePort = /true/i.test(process.env.SSL_ENABLED) ? sslPort : port

/** @type {import('../../../domain/event-broker').EventBroker} */
let broker
/** @type {import('../../../domain/model-factory').ModelFactory} */
let models
/** @type {WebSocket} */
let ws
let failoverPriority = 65535
let serviceUrl
let uplinkCallback

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
    return addresses
  }
}

/**
 * Use multicast DNS to find the host
 * instance configured as the "switch"
 * node for the local area network.
 *
 * @returns {Promise<string>} url
 */
async function resolveServiceUrl () {
  const dns = Dns()
  let url

  return new Promise(async function (resolve) {
    dns.on('response', function (response) {
      DEBUG && console.debug(resolveServiceUrl.name, response)

      const answer = response.answers.find(
        a => a.name === SERVICENAME && a.type === 'SRV'
      )

      if (answer) {
        url = `${protocol}://${answer.data.target}:${answer.data.port}`
        console.info('found dns service record for', SERVICENAME, url)
        resolve(url)
      }
    })

    dns.on('query', function (query) {
      DEBUG && console.debug('got a query packet:', query)

      const questions = query.questions.filter(
        q => q.name === SERVICENAME || q.name === HOSTNAME
      )

      if (questions[0] && (isSwitch || os.hostname === HOSTNAME)) {
        console.debug('answering for', HOSTNAME, protocol, servicePort)
        const answer = {
          answers: [
            {
              name: SERVICENAME,
              type: 'SRV',
              data: {
                port: servicePort,
                weight: 0,
                priority: 10,
                target: domain
              }
            },
            {
              name: HOSTNAME,
              type: 'A',
              ttl: 300,
              data: getLocalAddress()[0]
            }
          ]
        }

        dns.respond(answer)
      }
    })

    let failoverDelay
    const RETRYINTERVAL = config.retryInterval || 2000
    const MAXRETRY = config.maxRetry || 10

    function failover (retries) {
      if (!failoverDelay) {
        failoverDelay =
          Date.now() + RETRYINTERVAL * MAXRETRY * Math.random() * 10000
        return
      }
      const now = Date.now()
      const takeover = now > failoverDelay

      console.info(failover.name, {
        takeover,
        now,
        failoverDelay
      })
      return takeover
    }

    /**
     * Query  DNS for the webswitch server.
     * Recursively retry by incrementing a
     * counter we pass to ourselves on the
     * stack.
     *
     * @param {number} retries number of query attempts
     * @returns
     */
    function runQuery (retries = 0) {
      if (failover(retries)) {
        console.warn('assuming switch duties')
        isSwitch = true
        return
      }

      // let's query for an A record
      dns.query({
        questions: [
          {
            name: HOSTNAME,
            type: 'A'
          }
        ]
      })

      if (url) {
        resolve(url)
        return
      }

      setTimeout(() => runQuery(retries++), RETRYINTERVAL)
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
}

function dispose () {
  ws = null
}

/**
 * @typedef {object} HandshakeMsg
 * @property {string} proto the protocol 'web-switch'
 * @property {'node'|'browser'|'uplink'} role of the client
 * @property {number} pid - processid of the client or 1 for browsers
 * @property {string} serviceUrl - web-switch url for the client
 * @property {string[]} models - names of models running on the instance
 * @property {string} address - address of the client
 * @property {string} url - url to connect to client instance directly
 */

/**
 *
 * @param {{
 *  broker:import('../../../domain/event-broker').EventBroker,
 *  models:import('../../../domain/model-factory').ModelFactory
 * }} serviceInfo
 */
export async function connect (serviceInfo = {}) {
  broker = serviceInfo.broker || null
  models = serviceInfo.models || null
  await _connect()
}

/**
 *
 */
const handshake = {
  proto: SERVICENAME,
  role: 'node',
  pid: process.pid,
  address: getLocalAddress()[0],
  url: `${protocol}://${domain}:${servicePort}`,
  serialize () {
    return JSON.stringify({
      ...this,
      models: models?.getModelSpecs().map(spec => spec.modelName) || []
    })
  },
  validate (msg) {
    return msg.proto === this.proto
  }
}

/**
 *
 * @param {WebSocket} ws
 */
function startHeartBeat (ws) {
  let receivedPong = true

  ws.addListener('pong', function () {
    console.assert(!DEBUG, 'received pong')
    receivedPong = true
  })

  const intervalId = setInterval(async function () {
    if (receivedPong) {
      receivedPong = false
      ws.ping(0x9)
    } else {
      try {
        await broker.notify(TIMEOUTEVENT, 'server unresponsive')
        console.error(receivedPong, 'no response, trying new conn')
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
 * @param {*} broker
 * @param {{allowMultiple:boolean, once:boolean}} [options]
 */
export async function subscribe (eventName, callback, options = {}) {
  try {
    broker.on(eventName, callback, options)
  } catch (e) {
    console.error('subscribe', e)
  }
}

async function _connect () {
  if (!ws) {
    if (!serviceUrl) serviceUrl = await resolveServiceUrl()
    console.info(_connect.name, 'switch', serviceUrl)

    ws = new WebSocket(serviceUrl)

    ws.on('open', function () {
      ws.send(handshake.serialize())
      startHeartBeat(ws)
    })

    ws.on('error', function (error) {
      console.error(_connect.name, error)
      ws = null // get rid of this socket
    })

    ws.on('message', async function (message) {
      const eventData = JSON.parse(message)
      console.assert(!DEBUG, 'received event:', eventData)

      if (eventData.eventName) {
        if (broker) await broker.notify(eventData.eventName, eventData)
        if (uplinkCallback) await uplinkCallback(message)
        return
      }

      if (handshake.validate(eventData)) {
        failoverPriority = eventData.priority
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
  await _connect()
  if (!ws) setTimeout(reconnect, 60000)
}

function send (event) {
  if (ws?.readyState) {
    ws.send(JSON.stringify(event))
    return
  }
  setTimeout(send, 1000)
}

/**
 * Call this method to broadcast a message on the web-switch network
 * @param {object} event
 * @returns
 */
export async function publish (event) {
  try {
    if (!event) {
      console.error(publish.name, 'no event provided')
      return
    }
    await _connect()
    send(event)
  } catch (e) {
    console.error('publish', e)
  }
}

/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
'use strict'

import os from 'os'
import WebSocket from 'ws'
import makeMdns from 'multicast-dns'
import ObserverFactory from '../../../domain/observer'

const SERVICENAME = 'webswitch'
const HOSTNAME = 'webswitch.local'
const configRoot = require('../../../config').aegisConfig
const config = configRoot.services.serviceMesh.WebSwitch
const DEBUG = /true|yes|y/i.test(config.debug) || false
const heartbeat = config.heartbeat || 10000
const observer = ObserverFactory.getInstance()
const sslEnabled = process.env.SSL_ENABLED

let serviceUrl

if (!configRoot) console.error('WebSwitch', 'cannot access config file')

/**
 * @type import("ws/lib/websocket")
 */
let ws

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

async function resolveServiceUrl () {
  const mdns = makeMdns()
  return new Promise(async function (resolve, reject) {
    mdns.on('response', function (response) {
      console.log('got a response packet:', response)
      try {
        const address = response.answers.find(a => a.name === SERVICENAME)
        if (address)
          resolve(`${protocol}://${address.data.target}:${address.data.port}`)
      } catch (error) {
        reject('mdns.on', error)
      }
    })

    mdns.on('query', function (query) {
      console.log('got a query packet:', query)
      const discoveryRequest = query.questions.filter(
        q => q.name === SERVICENAME
      )
      if (discoveryRequest) {
        if (os.hostname === HOSTNAME || config.isSwitch === true) {
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

    // lets query for an A record for 'brunhilde.local'
    mdns.query({
      questions: [
        {
          name: 'webswitch.local',
          type: 'A'
        }
      ]
    })
  })
}

/**
 * Set callback for uplink.
 * @param {*} callback
 */
export function onUplinkMessage (callback) {
  uplinkCallback = callback
}

/**
 * server sets uplink host
 */
export function setUplinkUrl (uplinkUrl) {
  serviceUrl = uplinkUrl
}

const handshake = {
  getEvent () {
    return {
      proto: SERVICENAME,
      role: 'node',
      pid: process.pid
    }
  },
  serialize () {
    return JSON.stringify(this.getEvent())
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

  const intervalId = setInterval(function () {
    if (receivedPong) {
      receivedPong = false
      ws.ping(0x9)
    } else {
      try {
        observer.notify('webswitchTimeout', 'server unresponsive', true)
        console.error('mesh server unresponsive, trying new connection')
        ws = null // get a new socket
        clearInterval(intervalId)
      } catch (error) {
        console.error(startHeartBeat.name, error)
      }
    }
  }, heartbeat)
}

/**
 * @callback subscription
 * @param {{eventName:string, model:import('../../../domain/index').Model}} eventData
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

/**
 * Call this method to broadcast a message on the webswitch network
 * @param {*} event
 * @returns
 */
export async function publish (event) {
  try {
    if (!event) {
      console.error(publish.name, 'no event provided')
      return
    }

    if (!serviceUrl) serviceUrl = await resolveServiceUrl()
    console.debug('serviceUrl', serviceUrl)

    function sendEvent () {
      if (!ws) {
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
          }

          if (eventData.proto === SERVICENAME && eventData.pid) {
            ws.send(handshake.serialize())
            return
          }

          if (uplinkCallback) uplinkCallback(message)
        })

        return
      }

      function send () {
        if (ws?.readyState) {
          ws.send(JSON.stringify(event))
          return
        }
        setTimeout(send, 1000)
      }

      send()
    }
    sendEvent()
  } catch (e) {
    console.error('publish', e)
  }
}

export const initialize = () => publish(handshake.getEvent(), 10000)

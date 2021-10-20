'use strict'

const mlink = require('mesh-link')

const defaultConfig = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  uplink: {
    host: null,
    port: null
  },
  prefix: 'aegis',
  strict: false,
  relayLimit: 1,
  relayDelay: 0,
  updateInterval: 1000
}
let started = false

function uplink (config = defaultConfig) {
  // register uplink
}

function start (config = defaultConfig) {
  if (started) return
  started = true

  mlink
    .start(config)
    .then(() => {
      // connect to uplink if configured
      uplink(config.uplink)
    })
    .catch(error => {
      // error...
    })
}

function publishEvent (event, observer) {
  mlink.send(
    event.eventName,
    mlink.getNodeEndPoints(),
    JSON.stringify(event),
    response => {
      if (response) {
        const eventData = JSON.parse(response)
        if (eventData?.eventName) {
          observer.notify(eventData.eventName, eventData)
        }
      }
    }
  )
}

function subscribe (eventName, callback, observer) {}

exports = { start, uplink, publishEvent, subscribe }

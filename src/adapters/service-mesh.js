'use strict'

export function publish (service) {
  return async function (event, observer) {
    service.publish(event, observer)
  }
}

export function subscribe (service) {
  return async function (event, callback, observer = null) {
    service.subscribe(event, callback, observer)
  }
}

export function attachServer (service) {
  return async function (server) {
    service.attachServer(server)
  }
}

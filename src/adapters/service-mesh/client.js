'use strict'

export function connect(service) {
  return async function (serviceInfo = {}) {
    service.connect(serviceInfo)
  }
}

export function publish(service) {
  return async function (event) {
    //console.debug({ service, event })
    service.publish(event)
  }
}

export function subscribe(service) {
  return async function (event, callback) {
    service.subscribe(event, callback)
  }
}

export function close(service) {
  return function (reason) {
    service.close('reload')
  }
}

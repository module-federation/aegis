'use strict'

export function attachServer(service) {
  return async function (server) {
    service.attachServer(server)
  }
}

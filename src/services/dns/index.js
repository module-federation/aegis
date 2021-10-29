'use strict'

import * as localClients from './providers'
const getRemoteClients = async () => null //import('aegis-services/dns')

const dns = async function () {
  const name = process.env.DNS_SERVICE
  const remoteClients = await getRemoteClients()
  if (!remoteClients) return localClients[name]
  return remoteClients[name]
}

export default dns

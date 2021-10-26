export * as AuthorizationService from './auth'
export * as ClusterService from './cluster'
export * as EventService from './event-bus'
export * as StorageService from './persistence'

import { dns } from './dns'
import whois from './dns/whois'
export const DnsService = dns
export const WhoIsService = whois

import { initCertificateService } from './ca-cert'
export const CertificateService = {
  provisionCert: initCertificateService(dns, whois)
}

import * as MeshAdapter from '../adapters/service-mesh'
import * as MeshServices from './service-mesh'
import path from 'path'

console.log(MeshServices)
const config = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))

const enabled =
  Object.entries(config.services.serviceMesh)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k)
    .reduce(k => k) || 'WebSwitch'

const service =
  enabled === config.services.activeServiceMesh ? enabled : 'WebSwitch'

export const MeshService = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](MeshServices[k]) }))
    .reduce((a, b) => ({ ...a, ...b }))
}

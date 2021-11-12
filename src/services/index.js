export * as AuthorizationService from './auth'
export * as ClusterService from './cluster'
export * as EventService from './event-bus'
export * as StorageService from './persistence'

import dns from './dns'
import whois from './dns/whois'
export const DnsService = dns
export const WhoIsService = whois

import { initCertificateService } from './ca-cert'
export const CertificateService = {
  provisionCert: initCertificateService(dns, whois)
}

import * as MeshAdapter from '../adapters/service-mesh'
import * as MeshServices from './service-mesh'

const config = require('../config').aegisConfig
const designatedService = config.services.activeServiceMesh

/**
 * Which mesh service implementations are enabled?
 */
const enabledServices = Object.entries(config.services.serviceMesh)
  .filter(([, v]) => v.enabled)
  .map(([k]) => k) || ['WebSwitch']

/**
 * Which mesh service do we use?
 */
const service = enabledServices.includes(designatedService)
  ? designatedService
  : 'WebSwitch'

/**
 * Bind service to adapter.
 */
export const MeshService = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](MeshServices[service]) }))
    .reduce((a, b) => ({ ...a, ...b }))
}

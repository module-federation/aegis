export * as AuthorizationService from './auth'
export * as ClusterService from './cluster'
export * as EventService from './event-bus'
export * as StorageService from './persistence'
export { ServiceMeshPlugin } from './service-mesh'
export { default as CircuitBreaker } from '../domain/circuit-breaker'

import { dns, whois } from './middleware/network/dns'
export const DnsService = dns
export const WhoIsService = whois

import { initCertificateService } from './cert'
export const CertificateService = {
  provisionCert: initCertificateService(dns, whois)
}

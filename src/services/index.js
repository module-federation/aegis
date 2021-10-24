export * as MeshService from './service-mesh'
export * as AuthorizationService from './auth'
export * as ClusterService from './cluster'
export * as EventService from './event-bus'
export * as StorageService from './persistence'

import { dns } from './dns'
import whois from './dns/whois'
export const DnsService = dns
export const WhoIsService = whois

import { initCertificateService } from './ca-cert'
import { MeshService } from './service-mesh'
export const CertificateService = {
  provisionCert: initCertificateService(dns, whois)
}

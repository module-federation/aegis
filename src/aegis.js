const {
  CertificateService,
  AuthorizationService,
  ClusterService,
  ServiceMeshPlugin,
  StorageService
} = require('./services')
const { ServerlessAdapter, ServiceMeshAdapter } = require('./adapters')
const app = require('./app')

module.exports = async function aegis (options) {
  const service = await app.start()
  return {
    async provisionCert (domain) {
      return CertificateService.provisionCert(domain)
    },
    protectRoutes (routes) {
      return AuthorizationService.protectRoutes(service.routes)
    },
    runAsWebServer () {},
    async runAsServerlessFunction () {
      return ServerlessAdapter()
    },
    async runAsCluster () {
      ClusterService.startCluster(service)
    },
    runInBrowser () {
      console.error('not yet implemented')
    },
    registerPlugin (plugin) {}
  }
}

const {
  CertificateService,
  AuthorizationService,
  ClusterService,
  ServiceMeshPlugin,
  StorageService
} = require('./services')
const { ServerlessAdapter, ServiceMeshAdapter } = require('./adapters')
const host = require('./host')

async function aegis (options) {
  return {
    async importRemotes () {},

    createRoutes ({}) {},

    protectRoutes ({ routes, keys }) {
      AuthorizationService.protectRoutes(routes)
      return this
    },

    async provisionCert (domain) {
      await CertificateService.provisionCert(domain)
      return this
    },

    async runAsServerlessFunction () {
      ServerlessAdapter()
    },

    runAsCluster () {
      ClusterService.startCluster(service)
      return this
    },

    runAsClient () {
      console.error('run in browser')
      return this
    },

    async startHost () {
      return this
    }
  }
}

aegis
  .importRemotes(entries)
  .then(ae => ae.createRoutes(controllers))
  .then(ae => ae.protectRoutes(routes).provisionCert(domain))
  .then(ae => ae.runAsCluster(cores))
  .startHost(app)

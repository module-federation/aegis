'use strict'

const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')

const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const { importRemotes, UseCaseService } = domain
const overrides = { find, save, StorageService }
const debug = /true/i.test(process.env.DEBUG)

const {
  deleteModels,
  getConfig,
  getModels,
  getModelsById,
  http,
  initCache,
  patchModels,
  postModels,
  liveUpdate
} = adapters.controllers

const apiRoot = process.env.API_ROOT || '/microlib/api'
const modelPath = `${apiRoot}/models`

function adminRoute (adapter, getConfig, router) {
  router.get(`${apiRoot}/config`, adapter(getConfig()))
}

function makeRoutes (path, method, controllers, router, http) {
  controllers().forEach(ctlr => {
    console.info(ctlr)
    router[method](path(ctlr.endpoint), http(ctlr.fn))
  })
}

const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`

async function initServer (router) {
  const cache = initCache()
  makeRoutes(endpoint, 'use', liveUpdate, router, http)
  makeRoutes(endpoint, 'get', getModels, router, http)
  makeRoutes(endpoint, 'post', postModels, router, http)
  makeRoutes(endpointId, 'get', getModelsById, router, http)
  makeRoutes(endpointId, 'patch', patchModels, router, http)
  makeRoutes(endpointId, 'delete', deleteModels, router, http)
  makeRoutes(endpointCmd, 'patch', patchModels, router, http)
  adminRoute(http, getConfig, router)
  await cache.load()
}

async function initServerless (remotes) {
  debug && console.debug('handle invoked', remotes)
  const cache = initCache()
  const service = UseCaseService()
  await cache.load()
  return {
    async handle (serviceName, modelName, ...args) {
      return service[serviceName](modelName)(args)
    }
  }
}

exports.init = async function (remotes, router) {
  await importRemotes(remotes, overrides)
  return router ? initServer(router) : initServerless()
}

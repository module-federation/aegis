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

const apiRoot = process.env.API_ROOT || '/aegis/api'
const modelPath = `${apiRoot}/models`

function adminRoute (adapter, getConfig, router) {
  router.get(`${apiRoot}/config`, adapter(getConfig()))
}

function makeRoutes (path, method, controllers, http, router) {
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
  makeRoutes(endpoint, 'use', liveUpdate, http, router)
  makeRoutes(endpoint, 'get', getModels, http, router)
  makeRoutes(endpoint, 'post', postModels, http, router)
  makeRoutes(endpointId, 'get', getModelsById, http, router)
  makeRoutes(endpointId, 'patch', patchModels, http, router)
  makeRoutes(endpointId, 'delete', deleteModels, http, router)
  makeRoutes(endpointCmd, 'patch', patchModels, http, router)
  adminRoute(http, getConfig, router)
  await cache.load()
}

async function initServerless () {
  debug && console.debug('handle invoked')
  const cache = initCache()
  const service = UseCaseService()
  await cache.load()
  return {
    async handle (...args) {
      return service.serverless(...args)
    }
  }
}

exports.init = async function (remotes, router) {
  await importRemotes(remotes, overrides)
  return router ? initServer(router) : initServerless()
}

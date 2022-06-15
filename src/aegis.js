'use strict'

const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')
const { pathToRegexp } = require('path-to-regexp')

const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const overrides = { find, save, ...StorageService }
const { importRemotes } = domain

const {
  deleteModels,
  getConfig,
  getRoutes,
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
const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`

/**
 * Store routes and their controllers for direct invocation
 * (i.e. without an http server, as in the case of serverless)
 * @extends {Map}
 */
class RouteMap extends Map {
  find (path) {
    return [...super.keys()].find(
      regex => regex instanceof RegExp && regex.match(path)
    )
  }

  set (path, method) {
    super.set(pathToRegexp(path), method)
  }

  has (path) {
    return this.find(path) ? true : false
  }

  get (path) {
    return this.find(path)
  }
}

const routes = new RouteMap()

const route = {
  /**
   *
   * @param {*} path
   * @param {*} method
   * @param {*} controllers
   * @param {*} http
   * @param {*} router
   */
  server (path, method, controllers, http, router) {
    controllers().forEach(ctlr =>
      router[method](path(ctlr.endpoint), http(ctlr.fn))
    )
  },

  serverless (path, method, controllers, http) {
    controllers().forEach(ctlr => {
      const modelPath = path(ctlr.endpoint)
      if (routes.has(modelPath)) {
        routes.set(modelPath, {
          ...routes.get(modelPath),
          [method]: http(ctlr.fn)
        })
        return
      }
      routes.set(modelPath, { [method]: http(ctlr.fn) })
    })
  },

  specRoutes (adapter, getConfig, serverMode, router) {},

  adminRoute (adapter, getConfig, serverMode, router) {
    const adminPath = `${apiRoot}/config`
    if (/serverless/i.test(serverMode))
      routes.set(adminPath, adapter(getConfig()))
    else router.get(adminPath, adapter(getConfig()))
  }
}

async function makeRoutes (router = null) {
  const serverMode = router ? 'server' : 'serverless'
  route[serverMode](endpoint, 'use', liveUpdate, http, router)
  route[serverMode](endpoint, 'get', getModels, http, router)
  route[serverMode](endpoint, 'post', postModels, http, router)
  route[serverMode](endpointId, 'get', getModelsById, http, router)
  route[serverMode](endpointId, 'patch', patchModels, http, router)
  route[serverMode](endpointId, 'delete', deleteModels, http, router)
  route[serverMode](endpointCmd, 'patch', patchModels, http, router)
  route.specRoutes(http, getRoutes, serverMode, router)
  route.adminRoute(http, getConfig, serverMode, router)
}

async function initServerless () {
  return {
    async handle (path, method, req, res) {
      if (!routes.has(path)) throw new Error('not found')
      const controller = routes.get(path)[method]
      if (typeof controller !== 'function')
        throw new Error('no controller for', path, method)
      return controller(req, res)
    }
  }
}

exports.init = async function (remotes, router) {
  await importRemotes(remotes, overrides)
  const cache = initCache()
  makeRoutes(router)
  await cache.load()
  return initServerless()
}

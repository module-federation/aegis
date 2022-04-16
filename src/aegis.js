'use strict'

const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')

const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const overrides = { find, save, StorageService }
const { importRemotes } = domain

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
const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`

/**
 * Store routes and their controllers for direct invocation
 * (i.e. without an http server, as in the case of serverless)
 * @extends {Map}
 */
class RouteMap extends Map {
  idRoute (route) {
    return route
      .split('/')
      .splice(0, 5)
      .concat([':id'])
      .join('/')
  }

  cmdRoute (route) {
    return route
      .split('/')
      .splice(0, 6)
      .concat([':id', ':command'])
      .join('/')
  }

  has (route) {
    if (!route) {
      console.warn('route is ', typeof route)
      return false
    }

    if (super.has(route)) {
      this.route = super.get(route)
      return true
    }

    const idInstance = this.idRoute(route)
    if (route.match(/\//g).length === 5 && super.has(idInstance)) {
      this.route = super.get(idInstance)
      return true
    }

    const cmdInstance = this.cmdRoute(route)
    if (route.match(/\//g).length === 6 && super.has(cmdInstance)) {
      this.route = super.get(cmdInstance)
      return true
    }
    return false
  }

  get (route) {
    return this.route ? this.route : super.get(route)
  }
}

const routeMap = new RouteMap()

const route = {
  server (path, method, controllers, http, router) {
    controllers().forEach(ctlr => {
      console.info(ctlr)
      router[method](path(ctlr.endpoint), http(ctlr.fn))
    })
  },

  serverless (path, method, controllers) {
    controllers().forEach(ctlr => {
      const routePath = path(ctlr.endpoint)
      if (routeMap.has(routePath)) {
        routeMap.set(routePath, {
          ...routeMap.get(routePath),
          [method]: http(ctlr.fn)
        })
        return
      }
      routeMap.set(routePath, { [method]: http(ctlr.fn) })
    })
  },

  adminRoute (adapter, getConfig, serverMode, router) {
    const adminPath = `${apiRoot}/config`
    if (/serverless/i.test(serverMode))
      routeMap.set(adminPath, adapter(getConfig()))
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
  route.adminRoute(http, getConfig, serverMode, router)
}

async function initServerless () {
  return {
    async handle (path, method, req, res) {
      if (!routeMap.has(path)) throw new Error('not found')
      const controller = routeMap.get(path)[method]
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

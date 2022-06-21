'use strict'

const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')
const { pathToRegexp, match } = require('path-to-regexp')
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
 * as serverless functions
 * @extends {Map}
 */
class RouteMap extends Map {
  find (path) {
    const routeInfo = [...super.values()].find(v => v.regex.test(path))
    if (routeInfo)
      return { ...routeInfo, params: routeInfo.matcher(path).params }
  }

  set (path, method) {
    if (super.has(path)) {
      super.set(path, { ...super.get(path), ...method })
      return
    }

    super.set(path, {
      ...method,
      regex: pathToRegexp(path),
      matcher: match(path)
    })
  }

  has (path) {
    this.hasPath = path
    this.routeInfo = this.find(path)
    return this.routeInfo ? true : false
  }

  get (path) {
    // if equal we already know the answer
    return path === this.hasPath ? this.routeInfo : this.find(path)
  }
}

const routes = new RouteMap()

const route = {
  autoRoutes (path, method, controllers, http) {
    controllers().forEach(ctlr =>
      routes.set(path(ctlr.endpoint), { [method]: http(ctlr.fn) })
    )
  },

  userRoutes (adapter, getRoutes) {},

  adminRoute (adapter, getConfig) {
    const adminPath = `${apiRoot}/config`
    routes.set(adminPath, { get: adapter(getConfig()) })
  }
}

async function makeRoutes () {
  route.autoRoutes(endpoint, 'use', liveUpdate, http)
  route.autoRoutes(endpoint, 'get', getModels, http)
  route.autoRoutes(endpoint, 'post', postModels, http)
  route.autoRoutes(endpointId, 'get', getModelsById, http)
  route.autoRoutes(endpointId, 'patch', patchModels, http)
  route.autoRoutes(endpointId, 'delete', deleteModels, http)
  route.autoRoutes(endpointCmd, 'patch', patchModels, http)
  route.userRoutes(http, getRoutes)
  route.adminRoute(http, getConfig)
  console.log(routes)
}

/**
 *
 * @param {*} path
 * @param {*} method
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
async function handle (path, method, req, res) {
  const routeInfo = routes.get(path)
  if (!routeInfo) {
    console.warn('no controller for', path)
    res.status(404).send('not found')
    return
  }
  const controller = routeInfo[method.toLowerCase()]
  if (typeof controller !== 'function') {
    console.warn('no controller for', path, method)
    res.status(404).send('not found')
    return
  }
  const requestInfo = Object.assign(req, { params: routeInfo.params })
  return controller(requestInfo, res)
}

exports.init = async function (remotes) {
  await importRemotes(remotes, overrides)
  const cache = initCache()
  makeRoutes()
  await cache.load()
  return handle
}

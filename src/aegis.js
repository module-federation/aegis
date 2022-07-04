'use strict'

const { EventBrokerFactory, importRemotes } = require('./domain')
const services = require('./services')
const adapters = require('./adapters')
const { StorageService } = services
const { StorageAdapter } = adapters
const { pathToRegexp, match } = require('path-to-regexp')
const { find, save } = StorageAdapter
const overrides = { find, save, ...StorageService }
const broker = EventBrokerFactory.getInstance()

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

const router = {
  autoRoutes (path, method, controllers, adapter) {
    controllers().forEach(ctlr =>
      routes.set(path(ctlr.endpoint), { [method]: adapter(ctlr.fn) })
    )
  },

  userRoutes (controllers) {
    controllers().forEach(ctlr => routes.set(ctlr.path, ctlr))
  },

  adminRoute (controller, adapter) {
    const adminPath = `${apiRoot}/config`
    routes.set(adminPath, { get: adapter(controller()) })
  }
}

async function makeRoutes () {
  router.autoRoutes(endpoint, 'get', liveUpdate, http)
  router.autoRoutes(endpoint, 'get', getModels, http)
  router.autoRoutes(endpoint, 'post', postModels, http)
  router.autoRoutes(endpointId, 'get', getModelsById, http)
  router.autoRoutes(endpointId, 'patch', patchModels, http)
  router.autoRoutes(endpointId, 'delete', deleteModels, http)
  router.autoRoutes(endpointCmd, 'patch', patchModels, http)
  router.adminRoute(getConfig, http)
  router.userRoutes(getRoutes)
  console.log(routes)
}

/**
 * Universal controller - find the controller
 * for a given {@link path} and invoke it.
 *
 * @param {string} path
 * @param {'get'|'patch'|'post'|'delete'} method
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
    return
  }

  const requestInfo = Object.assign(req, { params: routeInfo.params })

  try {
    return await controller(requestInfo, res)
  } catch (error) {
    console.error({ fn: handle.name, error })
    res.res.status(500).send({ msg: 'an error occured', error })
  }
}

/**
 * tell components to dispose of any system resources
 */
exports.dispose = async function () {
  console.log('system hot-reloading')
  await broker.notify('reload', 'system reload')
}

/**
 * When called to perform a hot reload, stop all thread pools.
 * Import remote modules, then build APIs, storage adapters, etc.
 * Return {@link handle} universal controller for use by server
 * or serverless function.
 *
 * @param {import('../webpack/remote-entries-type')} remotes
 * @returns {function(string,string,Request,Response)} {@link handle}
 */
exports.init = async function (remotes) {
  // stream federated components
  await importRemotes(remotes, overrides)
  const cache = initCache()
  // create endpoints
  makeRoutes()
  // load from storage
  await cache.load()
  // hand controllers
  return handle
}

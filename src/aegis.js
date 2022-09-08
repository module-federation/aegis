'use strict'

const domain = require('./domain')
const services = require('./services')
const adapters = require('./adapters')
const { EventBrokerFactory, DomainEvents, importRemotes } = domain
const { badUserRoute, reload } = DomainEvents
const { StorageService } = services
const { StorageAdapter } = adapters
const { pathToRegexp, match } = require('path-to-regexp')
const { AsyncLocalStorage } = require('async_hooks')
const { nanoid } = require('nanoid')
const { EventEmitter } = require('stream')
const { sync } = require('rimraf')
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
  liveUpdate,
  anyInvokePorts
} = adapters.controllers

const apiRoot = process.env.API_ROOT || '/aegis/api'
const modelPath = process.env.MODEL_PATH || `${apiRoot}/models`
const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`
const endpointPort = e => `${modelPath}/${e}/service/ports/:port`
const endpointPortId = e => `${modelPath}/${e}/:id/service/ports/:port`

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

function buildPath (ctrl, path) {
  return ctrl.path && ctrl.path[path.name]
    ? ctrl.path[path.name]
    : path(ctrl.endpoint)
}

const router = {
  autoRoutes (path, method, controllers, adapter) {
    controllers()
      .filter(ctrl => !ctrl.internal)
      .forEach(ctrl => {
        if (ctrl.ports)
          Object.values(ctrl.ports).forEach(port => {
            if (port.path) routes.set(port.path)
          })
        routes.set(buildPath(ctrl, path), {
          [method]: adapter(ctrl.fn)
        })
      })
  },

  userRoutes (controllers) {
    try {
      controllers().forEach(ctlr => routes.set(ctlr.path, ctlr))
    } catch (error) {
      broker.notify(badUserRoute.name, badUserRoute(error))
      console.warn(badUserRoute(error))
    }
  },

  adminRoute (controller, adapter) {
    const adminPath = `${apiRoot}/config`
    routes.set(adminPath, { get: adapter(controller()) })
  }
}

function makeRoutes () {
  router.autoRoutes(endpoint, 'get', liveUpdate, http)
  router.autoRoutes(endpoint, 'get', getModels, http)
  router.autoRoutes(endpoint, 'post', postModels, http)
  router.autoRoutes(endpointId, 'get', getModelsById, http)
  router.autoRoutes(endpointId, 'patch', patchModels, http)
  router.autoRoutes(endpointId, 'delete', deleteModels, http)
  router.autoRoutes(endpointCmd, 'patch', patchModels, http)
  router.autoRoutes(endpointPort, 'post', anyInvokePorts, http)
  router.autoRoutes(endpointPort, 'patch', anyInvokePorts, http)
  router.autoRoutes(endpointPort, 'delete', anyInvokePorts, http)
  router.autoRoutes(endpointPort, 'get', anyInvokePorts, http)
  router.autoRoutes(endpointPortId, 'post', anyInvokePorts, http)
  router.autoRoutes(endpointPortId, 'patch', anyInvokePorts, http)
  router.autoRoutes(endpointPortId, 'delete', anyInvokePorts, http)
  router.autoRoutes(endpointPortId, 'get', anyInvokePorts, http)
  router.adminRoute(getConfig, http)
  router.userRoutes(getRoutes)
  console.log(routes)
}

/**
 * Invoke the controller for a given
 * {@link path} and {@link method}.
 *
 *
 * @param {string} path
 * @param {'get'|'patch'|'post'|'delete'} method
 * @param {Request} req
 * @param {Response} res
 * @returns
 */
function handle (path, method, req, res) {
  const routeInfo = routes.get(path)

  if (!routeInfo) {
    console.warn('no controller for', path)
    res.sendStatus(404)
    return
  }

  const controller = routeInfo[method.toLowerCase()]

  if (typeof controller !== 'function') {
    console.warn('no controller for', path, method)
    res.sendStatus(404)
    return
  }

  const requestInfo = Object.assign(req, { params: routeInfo.params })

  try {
    return controller(requestInfo, res)
  } catch (error) {
    console.error({ fn: handle.name, error })
    res.sendStatus(500)
  }
}

const context = new AsyncLocalStorage()

function handleWithContext () {
  return (path, method, req, res) =>
    context.run(new Map([['id', nanoid()]]), handle, path, method, req, res)
}

/**
 * Tell components to clean up any system resources
 */
exports.dispose = async function () {
  console.log('system hot-reloading')
  broker.notify(reload, 'system reload')
}

/**
 * When called to perform a hot reload, stop all thread pools.
 * Import remote modules, then build APIs, storage adapters, etc.
 * Return controller interface  {@link handle} for use by server
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
  // controllers
  return handleWithContext()
}

EventEmitter.captureRejections = true

process.on('uncaughtException', error => {
  console.error('uncaughtException, shutting down', error)
  process.exit(1)
})

'use strict'

const domain = require('./domain')
const adapters = require('./adapters')
const {
  EventBrokerFactory,
  DomainEvents,
  importRemotes,
  requestContext
} = domain
const { badUserRoute, reload } = DomainEvents
const { pathToRegexp, match } = require('path-to-regexp')
const { nanoid } = require('nanoid')
const { EventEmitter } = require('stream')
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
  postEntry,
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
const routeOverrides = new Map()

function buildPath (ctrl, path) {
  return ctrl.path && ctrl.path[path.name]
    ? ctrl.path[path.name]
    : path(ctrl.endpoint)
}

function checkAllowedMethods (ctrl, method) {
  if (!ctrl.ports.methods) return true
  return ctrl.ports.methods.includes(method)
}

const router = {
  autoRoutes (path, method, controllers, adapter, ports = false) {
    controllers()
      .filter(ctrl => !ctrl.internal)
      .forEach(ctrl => {
        if (ports) {
          if (ctrl.ports) {
            for (const portName in ctrl.ports) {
              const port = ctrl.ports[portName]
              const specPortMethods = port?.methods?.join('|').toLowerCase() || ""

              if (port.path) {
                routeOverrides.set(port.path, portName)
              }

              if (checkAllowedMethods(ctrl, method) && (!port.methods || (specPortMethods.includes(method.toLowerCase()))) ) {
                routes.set(port.path || path(ctrl.endpoint), {
                  [method]: adapter(ctrl.fn)
                })
              }
            }
          }
        } else {
          routes.set(buildPath(ctrl, path), {
            [method]: adapter(ctrl.fn)
          })
        }
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

  adminRoute (controller, adapter, method, path) {
    const adminPath = `${apiRoot}/${path}`
    routes.set(adminPath, { [method]: adapter(controller()) })
  }
}

function makeRoutes () {
  router.adminRoute(getConfig, http)
  router.userRoutes(getRoutes)
  router.autoRoutes(endpoint, 'get', liveUpdate, http)
  router.autoRoutes(endpoint, 'get', getModels, http)
  router.autoRoutes(endpoint, 'post', postModels, http)
  router.autoRoutes(endpointId, 'get', getModelsById, http)
  router.autoRoutes(endpointId, 'patch', patchModels, http)
  router.autoRoutes(endpointId, 'delete', deleteModels, http)
  router.autoRoutes(endpointCmd, 'patch', patchModels, http)
  router.autoRoutes(endpointPort, 'post', anyInvokePorts, http, true)
  router.autoRoutes(endpointPort, 'patch', anyInvokePorts, http, true)
  router.autoRoutes(endpointPort, 'delete', anyInvokePorts, http, true)
  router.autoRoutes(endpointPort, 'get', anyInvokePorts, http, true)
  router.autoRoutes(endpointPortId, 'post', anyInvokePorts, http, true)
  router.autoRoutes(endpointPortId, 'patch', anyInvokePorts, http, true)
  router.autoRoutes(endpointPortId, 'delete', anyInvokePorts, http, true)
  router.autoRoutes(endpointPortId, 'get', anyInvokePorts, http, true)
  router.adminRoute(getConfig, http, 'get', 'config')
  router.adminRoute(postEntry, http, 'post', 'deploy')
  router.userRoutes(getRoutes)
  console.log(routes)
}

/**
 * Invoke the controller for a given
 * {@link path} and {@link method}.
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
    // track this request
    requestContext.enterWith(
      new Map([
        ['id', req.headers['idempotency-key'] || nanoid()],
        ['checkIdempotency', req.headers['idempotency-key'] ? true : false],
        ['begin', Date.now()],
        ['user', req.user],
        ['res', res],
        ['path', path],
        ['headers', req.headers]
      ])
    )
    console.debug(`enter context ${requestContext.getStore().get('id')}`)

    // run controller and fulfill request
    const result = await controller(requestInfo, res)

    // get current request
    const store = requestContext.getStore()
    store.set('end', Date.now())

    const perfMsg = {
      requestId: store.get('id'),
      threadDuration: store.get('threadDuration'),
      totalDuration: store.get('end') - store.get('begin')
    }
    console.log(perfMsg)
    broker.notify('perf', perfMsg)

    return result
  } catch (error) {
    console.error({ fn: handle.name, error })
    if (!res.headersSent) res.status(500).send(error.message)
  } finally {
    const msg = `exit context ${requestContext.getStore()?.get('id')}`
    requestContext.exit(() => console.log(msg))
  }
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
  await importRemotes(remotes)
  const cache = initCache()
  // create endpoints
  makeRoutes()
  // dont await completion
  cache.load()
  // controllers
  return handle
}

EventEmitter.captureRejections = true

process.on('uncaughtException', error => {
  // if request avail, end it properly
  const store = requestContext.getStore()
  if (store) {
    const res = store.get('res')
    if (res && !res.headersSent) res.status(500).send(error)
  }
  console.error('uncaughtException', error)
  broker.notify('uncaughtException', error)
})

<<<<<<< HEAD
'use strict'

const router = require('express').Router
const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')

const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const { importRemotes } = domain

const {
  deleteModels,
  getConfig,
  getModels,
  getModelsById,
  http,
  initCache,
  patchModels,
  postModels
} = adapters.controllers

const make = {
  /**
   * webserver mode - create routes and register controllers
   * @param {*} path
   * @param {*} app
   * @param {*} method
   * @param {*} controllers
   */
  webserver (path, method, controllers, app, http) {
    controllers().forEach(ctlr => {
      console.info(ctlr)
      app[method](path(ctlr.endpoint), http(ctlr.fn))
    })
  },

  /**
   * serverless mode - execute controllers directly
   * @param {*} path
   * @param {*} method
   * @param {*} controllers
   */
  // serverless (path, method, controllers, http) {
  //   controllers().forEach(ctlr => {
  //     const route = path(ctlr.endpoint)
  //     if (routes.has(route)) {
  //       routes.set(route, {
  //         ...routes.get(route),
  //         [method]: http(ctlr.fn)
  //       })
  //       return
  //     }
  //     routes.set(route, { [method]: http(ctlr.fn) })
  //   })
  // },

  admin (adapter, serverMode, getConfig, app) {
    if (serverMode === make.webserver.name) {
      app.get(`${apiRoot}/config`, adapter(getConfig()))
    }
    // } else if (serverMode === make.serverless.name) {
    //   routes.set(`${apiRoot}/config`, { get: adapter(getConfig()) })
    //   console.info(routes)
    // }
  }
}

const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`

exports.init = async function (remotes) {
  const overrides = { find, save, StorageService }
  await importRemotes(remotes, overrides)
  const serverMode = make.webserver.name
  const cache = initCache()
  make[serverMode](endpoint, 'get', getModels, router, http)
  make[serverMode](endpoint, 'post', postModels, router, http)
  make[serverMode](endpointId, 'get', getModelsById, router, http)
  make[serverMode](endpointId, 'patch', patchModels, router, http)
  make[serverMode](endpointId, 'delete', deleteModels, router, http)
  make[serverMode](endpointCmd, 'patch', patchModels, router, http)
  make.admin(http, serverMode, getConfig, router, http)
  await cache.load()
  return {
    routes: () => router,
    handle: handleServerless
  }
}

async function handleServerless (...args) {}
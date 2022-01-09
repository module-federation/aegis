'use strict'

const router = require('express').Router
const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')
const ModelFactory = domain.default

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

function adminRoute (adapter, getConfig, app) {
  app.get(`${apiRoot}/config`, adapter(getConfig()))
}

function makeRoutes (path, method, controllers, app, http) {
  controllers().forEach(ctlr => {
    console.info(ctlr)
    app[method](path(ctlr.endpoint), http(ctlr.fn))
  })
}

const endpoint = e => `${modelPath}/${e}`
const endpointId = e => `${modelPath}/${e}/:id`
const endpointCmd = e => `${modelPath}/${e}/:id/:command`
const ThreadPool = []

exports.init = async function (remotes) {
  const overrides = { find, save, StorageService }
  await importRemotes(remotes, overrides)

  const Models = ModelFactory.getModelSpecs().map(m => m.modelName)

  if (ThreadPool.length < 1) {
    Models.forEach(m => {
      ThreadPool.push({
        modelName: m.modelName,
        thread: new Worker('./worker.js', {
          workerData: { modelName: m.modelName }
        })
      })
    })
  }

  const cache = initCache()
  makeRoutes(endpoint, 'get', getModels, router, http)
  makeRoutes(endpoint, 'post', postModels, router, http)
  makeRoutes(endpointId, 'get', getModelsById, router, http)
  makeRoutes(endpointId, 'patch', patchModels, router, http)
  makeRoutes(endpointId, 'delete', deleteModels, router, http)
  makeRoutes(endpointCmd, 'patch', patchModels, router, http)
  adminRoute(http, getConfig, router, http)
  await cache.load()
  return {
    path: '/',
    routes: router,
    handle: handleServerless
  }
}

async function handleServerless (...args) {}

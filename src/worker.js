'use strict'

const { importRemotes } = require('./domain')
const { workerData, parentPort } = require('worker_threads')
const path = require('path')
const remotes = require(path.resolve(
  process.cwd(),
  'webpack',
  'remote-entries.js'
))
const services = require('./services')
const adapters = require('./adapters')
const domain = require('./domain')
const router = require('./router')
const ModelFactory = domain.default
const modelName = workerData
const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const { importRemotes } = domain

async function init () {
  const overrides = { find, save, StorageService }
  await importRemotes(remotes, overrides)
  loadModels(modelName)
}

function handleRequest (httpRequest) {}

parentPort.on('message', httpRequest => {
  parentPort.postMessage(handleRequest(httpRequest))
})

init().then(() => console.log('aegis worker thread running'))

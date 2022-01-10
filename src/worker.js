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
const { UseCaseService } = require('./domain/use-cases')
const ModelFactory = domain.default
const modelName = workerData
const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter

async function init (modelName) {
  const overrides = { find, save, StorageService }
  const modelServiceRems = remotes.filter(r => r.service === modelName)
  await importRemotes(modelServiceRems, overrides)
  //loadModels(modelName)
  return UseCaseService(modelName)
}

init().then(async service => {
  console.log('aegis worker thread running')
  parentPort.on('message', async event => {
    const result = await service[event.function](event.data)
    parentPort.postMessage(result)
  })
})

function handleRequest (httpRequest) {}

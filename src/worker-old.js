'use strict'

const { importRemotes } = require('./domain')
const { workerData, parentPort } = require('worker_threads')
const services = require('./services')
const adapters = require('./adapters')
const { UseCaseService } = require('./domain/use-cases')
const modelName = workerData
const { StorageService } = services
const { StorageAdapter } = adapters
const { find, save } = StorageAdapter
const entry = require('remoteEntry.js')
const getRemoteEntries = entry.aegis
  .get('./remote-entries')
  .then(factory => factory())
getRemoteEntries.then((worker = worker.init()))

async function start (remotes) {
  const overrides = { find, save, StorageService }
  const modelServiceRems = remotes.filter(r => r.service === modelName)
  await importRemotes(modelServiceRems, overrides)
  //loadModels(modelName)
  return UseCaseService(modelName)
}

getRemoteEntries.then(remotes => {
  start(remotes).then(async service => {
    console.log('aegis worker thread running')
    parentPort.on('message', async event => {
      const result = await service[event.function](event.data)
      parentPort.postMessage(result)
    })
  })
})

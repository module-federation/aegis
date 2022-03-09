'use strict'

const domainEvents = {
  internalCacheRequest: modelName =>
    `internalCacheRequest_${modelName.toUpperCase()}`,
  externalCacheRequest: modelName =>
    `externalCacheRequest_${modelName.toUpperCase()}`,
  internalCacheResponse: modelName =>
    `internalCacheResponse_${modelName.toUpperCase()}`,
  externalCacheResponse: modelName =>
    `externalCacheResponse_${modelName.toUpperCase()}`,
  externalCrudEvent: eventName => `externalCrudEvent_${eventName}`,
  cacheSyncEvent: (modelName, id) => `${modelName.toUpperCase()}_${id}`,
  cacheCreateEvent: modelName => `cacheCreateEvent_${modelName.toUpperCase()}`,
  cacheUpdateEvent: modelName => `cacheUpdateEvent_${modelName.toUpperCase()}`,
  unauthorizedCommand: modelName =>
    `unauthorizedCommand_${modelName.toUpperCase()}`,
  undoStarted: modelName => `undoStart_${modelName.toUpperCase()}`,
  undoFailed: modelName => `undoFailed_${modelName.toUpperCase()}`,
  undoWorked: modelName => `undoWorked_${modelName.toUpperCase()}`,
  addModel: modelName => `addModel_${modelName.toUpperCase()}`,
  editModel: modelName => `editModel_${modelName.toUpperCase()}`,
  portTimeout: (modelName, port) =>
    `portTimeout_${port}_${modelName.toUpperCase()}`,
  portRetryFailed: (modelName, port) =>
    `portRetryFailed_${port}_${modelName.toUpperCase()}`,
  portRetryWorked: (modelName, port) =>
    `portRetryWorked_${port}_${modelName.toUpperCase()}`,
  publishEvent: modelName => `publishEvent_${modelName.toUpperCase()}`,
  sendToWorker: 'to_worker',
  sendToMesh: 'to_mesh',
  hotReload: modelName => `hotReload_${modelName}`,
  poolOpen: modelName => `poolOpen_${modelName.toUpperCase()}`,
  poolClose: modelName => `poolClose_${modelName.toUpperCase()}`,
  poolDrain: modelName => `poolDrain_${modelName.toUpperCase()}`,
  subscription: 'subscription'
}

export default domainEvents

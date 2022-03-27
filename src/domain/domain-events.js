'use strict'

const domainEvents = {
  internalCacheRequest: modelName =>
    `internalCacheRequest_${String(modelName).toUpperCase()}`,
  externalCacheRequest: modelName =>
    `externalCacheRequest_${String(modelName).toUpperCase()}`,
  internalCacheResponse: modelName =>
    `internalCacheResponse_${String(modelName).toUpperCase()}`,
  externalCacheResponse: modelName =>
    `externalCacheResponse_${String(modelName).toUpperCase()}`,
  externalCrudEvent: eventName =>
    `externalCrudEvent_${String(eventName).toUpperCase()}`,
  cacheSyncEvent: (modelName, id) => `${String(modelName).toUpperCase()}_${id}`,
  cacheCreateEvent: modelName =>
    `cacheCreateEvent_${String(modelName).toUpperCase()}`,
  cacheUpdateEvent: modelName =>
    `cacheUpdateEvent_${String(modelName).toUpperCase()}`,
  unauthorizedCommand: modelName =>
    `unauthorizedCommand_${String(modelName).toUpperCase()}`,
  unknownCommand: modelName =>
    `unknownCommand__${String(modelName).toUpperCase()}`,
  undoStarted: modelName => `undoStart_${String(modelName).toUpperCase()}`,
  undoFailed: modelName => `undoFailed_${String(modelName).toUpperCase()}`,
  undoWorked: modelName => `undoWorked_${String(modelName).toUpperCase()}`,
  addModel: modelName => `addModel_${String(modelName).toUpperCase()}`,
  editModel: modelName => `editModel_${String(modelName).toUpperCase()}`,
  portTimeout: (modelName, port) =>
    `portTimeout_${port}_${String(modelName).toUpperCase()}`,
  portRetryFailed: (modelName, port) =>
    `portRetryFailed_${port}_${String(modelName).toUpperCase()}`,
  portRetryWorked: (modelName, port) =>
    `portRetryWorked_${port}_${String(modelName).toUpperCase()}`,
  publishEvent: modelName => `publishEvent_${String(modelName).toUpperCase()}`,
  poolOpen: modelName => `poolOpen_${String(modelName).toUpperCase()}`,
  poolClose: modelName => `poolClose_${String(modelName).toUpperCase()}`,
  poolDrain: modelName => `poolDrain_${String(modelName).toUpperCase()}`,
  subscription: 'subscription',
  toWorker: 'to_worker',
  toMain: 'to_main',
  fromWorker: 'from_worker',
  fromMain: 'from_main',
  hotReload: 'hotReload'
}

export default domainEvents

'use strict'

const domainEvents = {
  internalCacheRequest: modelName => `internalCacheRequest_${modelName}`,
  externalCacheRequest: modelName => `externalCacheRequest_${modelName}`,
  internalCacheResponse: modelName => `internalCacheResponse_${modelName}`,
  externalCacheResponse: modelName => `externalCacheResponse_${modelName}`,
  externalCrudEvent: eventName => `externalCrudEvent_${eventName}`,
  cacheSyncEvent: (modelName, id) => `s${modelName}_${id}`,
  cacheCreateEvent: modelName => `cacheCreateEvent_${modelName}`,
  cacheUpdateEvent: modelName => `cacheUpdateEvent_${modelName}`,
  unauthorizedCommand: modelName => `unauthorizedCommand_${modelName}`,
  undoStarted: modelName => `undoStart_${modelName}`,
  undoFailed: modelName => `undoFailed_${modelName}`,
  undoWorked: modelName => `undoWorked_${modelName}`,
  addModel: modelName => `addModel_${modelName}`,
  editModel: modelName => `editModel_${modelName}`,
  portTimeout: (modelName, port) => `portTimeout_${port}_${modelName}`,
  portRetryFailed: (modelName, port) => `portRetryFailed_${port}_${modelName}`,
  portRetryWorked: (modelName, port) => `portRetryWorked_${port}_${modelName}`,
  publishEvent: modelName => `publishEvent_${modelName}`,
  forwardEvent: () => '__FWD_EVENT__',
  sendToWorker: modelName => `to_worker_${modelName}`,
  sendToMesh: eventName => `to_mesh_${eventName}`,
  fromWorker: eventName => `from_worker_${eventName}`,
  fromMain: eventName => `from_main_${eventName}`,
  hotReload: modelName => `hotReload_${modelName}`,
  poolOpen: modelName => `poolOpen_${modelName}`,
  poolClose: modelName => `poolClose_${modelName}`,
  poolDrain: modelName => `poolDrain_${modelName}`
}

export default domainEvents

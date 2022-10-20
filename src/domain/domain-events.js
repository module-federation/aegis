'use strict'

/**
 * @param {import('./event-broker').EventBroker} broker
 */
export function registerEvents (broker) {
  //
  broker.on('shutdown', signal => process.exit(signal || 0))
  broker.on('emitEvent', event => broker.notify(event.eventName, event))
}

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
  createModel: modelName => `addModel_${String(modelName).toUpperCase()}`,
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
  poolAbort: modelName => `poolAbort_${String(modelName).toUpperCase()}`,
  badUserRoute: error => `badUserRoute error: ${error}`,
  reload: 'reload'
}

export default domainEvents

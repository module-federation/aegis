'use strict'

const domainEvents = {
  internalCacheRequest: modelName => `internalCacheRequest_${modelName}`,
  externalCacheRequest: modelName => `externalCacheRequest_${modelName}`,
  internalCacheResponse: modelName => `internalCacheResponse_${modelName}`,
  externalCacheResponse: modelName => `externalCacheResponse_${modelName}`,
  cacheCreateEvent: modelName => `cacheCreateEvent_${modelName}`,
  cacheUpdateEvent: modelName => `cacheUpdateEvent_${modelName}`,
  unauthorizedCommand: model => `unauthorizedCommand_${model.getName()}`,
  undoStarted: model => `undoStart_${model.getName()}`,
  undoFailed: model => `undoFailed_${model.getName()}`,
  undoWorked: model => `undoWorked_${model.getName()}`,
  addModel: modelName => `addModel_${modelName}`,
  editModel: modelName => `editModel_${modelName}`,
  portTimeout: (model, port) => `portTimeout_${port}_${model.getName()}`,
  portRetryFailed: (model, port) =>
    `portRetryFailed_${port}_${model.getName()}`,
  portRetryWorked: (model, port) =>
    `portRetryWorked_${port}_${model.getName()}`,
  wasmPublishEvent: modelName => `wasmPublishEvent_${modelName}`
}

const doNotFwd = [
  domainEvents.internalCacheRequest.name,
  domainEvents.externalCacheRequest.name,
  domainEvents.externalCacheResponse.name,
  domainEvents.internalCacheResponse.name
]

export function listEventsToForward () {
  return Object.keys(domainEvents).filter(k => !doNotFwd.includes(k))
}

export default domainEvents

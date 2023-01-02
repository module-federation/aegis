const { EventEmitter } = require('stream')
const domainEvents = {
  internalCacheRequest: modelName => `internalCacheRequest_${modelName}`,
  internalCacheResponse: modelName => `internalCacheResponse_${modelName}`,
  externalCacheRequest: modelName => `externalCacheRequest_${modelName}`
}
const { internalCacheRequest, internalCacheResponse, externalCacheRequest } =
  domainEvents
const maxwait = 300

function requireRemoteObject (model, relation, broker, ...args) {
  const request = internalCacheRequest(relation.modelName.toUpperCase())
  const response = internalCacheResponse(relation.modelName.toUpperCase())

  console.debug({ fn: requireRemoteObject.name })

  const requestData = {
    eventName: request,
    modelName: model.getName().toUpperCase(),
    eventType: externalCacheRequest.name,
    eventSource: model.getName().toUpperCase(),
    eventTarget: relation.modelName.toUpperCase(),
    route: 'balanceEventTarget',
    modelId: model.getId(),
    relation,
    model,
    args
  }

  return new Promise(async function (resolve) {
    setTimeout(resolve, maxwait)
    broker.on(response, resolve)
    broker.emit(request, requestData)
  })
}

const broker = new EventEmitter({ captureRejections: true })
broker.on('error', err => console.log(err))

const model = {
  getName: () => 'model1',
  getId: () => 1
}

const relation = {
  modelName: 'model2'
}

broker.on(internalCacheRequest('MODEL2'), () =>
  setTimeout(() => broker.emit(internalCacheResponse('MODEL2'), 'success'), 100)
)

requireRemoteObject(model, relation, broker).then(result => console.log(result))

'use strict'

import { isMainThread } from 'worker_threads'
import { Writable, Transform } from 'node:stream'
import { hostConfig } from '../../config'
import e from 'express'

function nextModelFn (port, mf) {
  mf
    .getModelSpecs()
    .filter(spec => spec.ports)
    .map(spec =>
      Object.entries(spec.ports)
        .filter(p => port.consumesEvent === port)
        .reduce(p => spec.modelName, [])
    )[0]
}

function startWorkflow (model, mf) {
  const history = model.getPortFlow()
  const ports = model.getPorts()

  if (history?.length > 0 && !model.compensate) {
    const lastPort = history.length - 1
    const nextPort = ports[history[lastPort]]?.producesEvent
    const nextModel = nextModelFn(nextPort, mf)
    if (nextPort) model.emit(nextPort, nextModel)
  }
}

/**
 * deserialize and unmarshall from stream.
 * @typedef {import('..').Model}
 * @param {{
 *  models:import('../model-factory').ModelFactory,
 *  broker:import('../event-broker').EventBroker,
 *  repository:import('../datasource').default,
 *  modelName:string
 * }} options
 * @returns {function():Promise<void>}
 */
export default async function ({ modelName, repository, models }) {
  if (isMainThread) return

  const cacheLoadDisabled =
    /false/i.test(process.env.LOADCACHE) ||
    hostConfig.adapters.loadCache === false

  if (cacheLoadDisabled) return

  const resumeWorkflowDisabled =
    /false/i.test(process.env.RESUMEWORKFLOW) ||
    hostConfig.adapters.resumeWorkflow === false

  console.log('loading cache ', modelName)

  // const serializers = models.getModelSpec(modelName).serializers

  // const deserializers = serializers
  //   ? serializers.filter(s => !s.disabled && s.on === 'deserialize')
  //   : null

  // if (deserializers) deserializers.forEach(des => Serializer.addSerializer(des))

  const loadCache = new Writable({
    objectMode: true,

    write (chunk, _, next) {
      if (chunk?.id) repository.saveSync(chunk.id, chunk)
      next()
    }
  })

  const resumeWorkflow = new Transform({
    objectMode: true,

    transform (chunk, _, next) {
      startWorkflow(chunk, models)
      next()
    }
  })

  if (resumeWorkflowDisabled)
    repository.list({ writable: loadCache, transform: resumeWorkflow })
  else repository.list({ writable: loadCache })
}

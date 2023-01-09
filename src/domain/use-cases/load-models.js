'use strict'

import { isMainThread } from 'worker_threads'
import { Writable } from 'node:stream'
import { hostConfig } from '../../config'

function nextModelFn (port, modelFactory) {
  modelFactory
    .getModelSpecs()
    .filter(spec => spec.ports)
    .map(spec =>
      Object.entries(spec.ports)
        .filter(p => port.consumesEvent === port)
        .reduce(p => spec.modelName, [])
    )[0]
}

function startWorkflow (model, modelFactory) {
  const history = model.getPortFlow()
  const ports = model.getPorts()

  if (history?.length > 0 && !model.compensate) {
    const lastPort = history.length - 1
    const nextPort = ports[history[lastPort]]?.producesEvent
    const nextModel = nextModelFn(nextPort, modelFactory)
    if (nextPort) model.emit(nextPort, nextModel)
  }
}

/**
 * Add models to cache and run workflow.
 *
 * @typedef {import('..').Model}
 * @param {{
 *  models:import('../model-factory').ModelFactory,
 *  broker:import('../event-broker').EventBroker,
 *  repository:import('../datasource').default,
 *  modelName:string
 * }} options
 * @returns {function():Promise<void>}
 */
export default async function ({ repository, models }) {
  if (isMainThread) return

  const cacheLoadDisabled =
    /false/i.test(process.env.LOADCACHE) ||
    hostConfig.adapters.loadCache === false

  if (cacheLoadDisabled) return

  const loadCache = new Writable({
    objectMode: true,

    write (chunk, _, next) {
      if (chunk?.id) {
        repository.saveSync(chunk.id, chunk)
        startWorkflow(chunk, models)
      }
      next()
    }
  })

  repository.list({ writable: loadCache })
}

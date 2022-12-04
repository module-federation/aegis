'use strict'

import { isMainThread } from 'worker_threads'
import { Writable, Transform } from 'node:stream'
import Serializer from '../serializer'

function nextModel (port, mf) {
  mf.getModelSpecs()
    .filter(spec => spec.ports)
    .map(spec =>
      Object.entries(spec.ports)
        .filter(port => port.consumesEvent === nextPort)
        .reduce(s => spec.modelName)
    )[0]
}

function startWorkflow (model, mf) {
  const history = model.getPortFlow()
  const ports = model.getPorts()

  if (history?.length > 0 && !model.compensate) {
    const lastPort = history.length - 1
    const nextPort = ports[history[lastPort]]?.consumesEvent
    const nextModel = nextModel(nextPort, mf)
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
export default function ({ modelName, repository, broker, models }) {
  // main thread only
  if (!isMainThread) {
    console.log('loading cache ', modelName)
    const serializers = models.getModelSpec(modelName).serializers

    const deserializers = serializers
      ? serializers.filter(s => !s.disabled && s.on === 'deserialize')
      : null

    if (deserializers)
      deserializers.forEach(des => Serializer.addSerializer(des))

    const rehydrate = new Transform({
      objectMode: true,

      transform (chunk, _endcoding, next) {
        const model = models.loadModel(broker, repository, chunk, modelName)
        repository.saveSync(model.getId(), model)
        this.push(model)
        next()
      }
    })

    const resumeWorkflow = new Writable({
      objectMode: true,

      write (chunk, _encoding, next) {
        startWorkflow(chunk)
        next()
        return true
      },

      end (chunk, _encoding, done) {
        startWorkflow(chunk)
        done()
      }
    })

    repository.list({ transform: rehydrate, writable: resumeWorkflow })
  }
}

'use strict'

import { isMainThread } from 'worker_threads'
import { Writable, Transform } from 'node:stream'
import Serializer from '../serializer'

function startWorkflow (model) {
  const history = model.getPortFlow()
  const ports = model.getSpec().ports

  if (history?.length > 0 && !model.compensate) {
    const lastPort = history.length - 1
    const nextPort = ports[history[lastPort]].producesEvent

    if (nextPort && history[lastPort] !== 'workflowComplete') {
      model.emit(nextPort, startWorkflow.name)
    }
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
      },

      end (chunk, _encoding, done) {
        startWorkflow(chunk)
        done()
      }
    })

    repository.list({ transform: rehydrate, writable: resumeWorkflow })
  }
}

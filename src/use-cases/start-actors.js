'use strict'

import { isMainThread, Worker, workerData, parentPort } from 'worker_threads'
import { Observer } from '../domain/observer'

/**@typedef {import('../domain').ModelSpecification} ModelSpecification */

function cloneFunction (obj) {
  function stringify (obj) {
    return JSON.stringify(obj, function (key, value) {
      let fnBody
      if (value instanceof Function || typeof value == 'function') {
        fnBody = value.toString()

        if (fnBody.length < 8 || fnBody.substring(0, 8) !== 'function') {
          //this is ES6 Arrow Function
          return '_NuFrRa_' + fnBody
        }
        return fnBody
      }
      if (value instanceof RegExp) {
        return '_PxEgEr_' + value
      }
      return value
    })
  }

  function parse (str, date2obj) {
    var iso8061 = date2obj
      ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/
      : false

    return JSON.parse(str, function (key, value) {
      var prefix

      if (typeof value != 'string') {
        return value
      }
      if (value.length < 8) {
        return value
      }

      prefix = value.substring(0, 8)

      if (iso8061 && value.match(iso8061)) {
        return new Date(value)
      }
      if (prefix === 'function') {
        return eval('(' + value + ')')
      }
      if (prefix === '_PxEgEr_') {
        return eval(value.slice(8))
      }
      if (prefix === '_NuFrRa_') {
        return eval(value.slice(8))
      }

      return value
    })
  }

  function clone (obj) {
    return parse(stringify(obj))
  }

  return clone(obj)
}

/**
 * @callback eventHandler
 * @param {string} eventName
 * @param {object} eventData
 */

const WorkerObserver = {
  /**
   * @override
   * @param {string} eventName
   * @param {eventHandler} callback
   */
  on (eventName, callback) {},

  /**
   * @override
   */
  notify (eventName, data) {}
}

/**
 *
 * @param {import('../domain/model-factory').ModelFactory} model
 * @param {*} observer
 * @param {*} respository
 */
function startWorker (model, observer, respository) {
  model.getModelSpec().eventHandlers()
  if (isMainThread) {
    const model = models.createModel()
    const worker = new Worker('remote-file', {
      workerData: cloneFunction(model)
    })

    worker.on('message', message => ({
      // observer.notify()
    }))
  } else {
  }
}

/**
 * Create and/or start {@link ModelSpecification}.`start` number
 * of model instances. This is for models that need to run for
 * the life of the program as actors. N.B. such models are run
 * in worker threads for concurrency as actors. Default models
 * are part of the server actor, but do not run concurrently, 
 * but asynchronously in the single-threaded event loop. Note 
 * the server actor can create new model actors through the REST 
 * API or service mesh (on receipt of a message), 
 *
 * Cf. https://en.wikipedia.org/wiki/Actor_model
 *
 * @param {{
 *  models:import('../domain/model-factory').ModelFactory,
 *  repository:import('../domain/datasource-factory').DataSourceFactory
 * }}
 */
const makeStartActors = ({ models, repository, observer }) =>
  async function startActors () {
    const specs = models.getModelSpecs()

    const list = specs
      .filter(
        m =>
          m.start &&
          !repository.getDataSource(m.modelName).list({ count: m.start })
            .length === start
      )
      .map(m => ({ name: m.modelName, instances: m.start }))

    await Promise.allSettled(
      list.map(async m => {
        for (let i = 0; i < m.instances; i++) {
          startWorker(models)
        }
      })
    )
  }

export default makeStartActors

'use strict'

import Serializer from '../serializer'
import { resumeWorkflow } from '../orchestrator'
import { isMainThread } from 'worker_threads'

/**
 * @param {function(import("..").Model)} loadModel
 * @param {import("../event-broker").EventBroker} broker
 * @param {import("../datasource").default} repository
 * @returns {function(Map<string,Model>|Model)}
 */
function hydrateModels (loadModel, broker, repository) {
  return function (saved) {
    if (!saved) return

    try {
      if (saved instanceof Map) {
        return new Map(
          [...saved].map(function ([k, v]) {
            const model = loadModel(broker, repository, v, v.modelName)
            return [k, model]
          })
        )
      }

      if (Object.getOwnPropertyNames(saved).includes('modelName')) {
        return loadModel(broker, repository, saved, saved.modelName)
      }
    } catch (error) {
      console.warn(hydrateModels.name, error.message)
    }
  }
}

function handleError (e) {
  console.error(e)
}
/**
 *
 * @param {{
 *  repository:{import("../datasource").default}
 *  models:import('../model-factory').ModelFactory
 * }}
 */
function handleRestart (repository, eventName) {
  // console.log("resuming workflow", repository.name);

  if (process.env.RESUME_WORKFLOW_DISABLED) return

  repository
    .list()
    .then(resumeWorkflow)
    .catch(handleError)

  repository
    .list()
    .then(
      async list =>
        await Promise.allSettled(
          list.map(model => model.emit(eventName, model))
        )
    )
    .catch(handleError)
}

/**
 * Returns factory function to unmarshal deserialized models.
 * @typedef {import('..').Model}
 * @param {{
 *  models:import('../model-factory').ModelFactory,
 *  broker:import('../event-broker').EventBroker,
 *  repository:import('../datasource').default,
 *  modelName:string
 * }} options
 * @returns {function():Promise<void>}
 */
export default function ({
  modelName,
  repository,
  broker,
  models,
  handlers = []
}) {
  // main thread only
  if (isMainThread) {
    const eventType = models.EventTypes.ONLOAD
    const eventName = models.getEventName(eventType, modelName)
    handlers.forEach(handler => broker.on(eventName, handler))

    /**
     * Loads persited data from datd cc x
     */
    return async function loadModels () {
      const spec = models.getModelSpec(modelName)

      setTimeout(handleRestart, 30000, repository, eventName)

      return repository.load({
        hydrate: hydrateModels(models.loadModel, broker, repository),
        serializer: Serializer.addSerializer(spec.serializers)
      })
    }
  }
}

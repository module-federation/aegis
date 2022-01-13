'use strict'

import Serializer from '../serializer'
import { resumeWorkflow } from '../orchestrator'

/**
 * @param {function(import("..").Model)} loadModel
 * @param {import("../event-broker").EventBroker} broker
 * @param {import("../datasource").default} repository
 * @returns {function(Map<string,Model>|Model)}
 */
function hydrateModels(loadModel, broker, repository) {
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
      console.warn(loadModel.name, error.message)
    }
  }
}

function handleError(e) {
  console.error(e)
}
/**
 *
 * @param {import("../datasource").default} repository
 */
function handleRestart(repository) {
  // console.log("resuming workflow", repository.name);
  if (process.env.RESUME_WORKFLOW_DISABLED) return
  repository
    .list()
    .then(resumeWorkflow)
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
export default function ({ models, broker, repository, modelName }) {
  return async function loadModels() {
    const spec = models.getModelSpec(modelName)

    setTimeout(handleRestart, 30000, repository)

    return repository.load({
      hydrate: hydrateModels(models.loadModel, broker, repository),
      serializer: Serializer.addSerializer(spec.serializers)
    })
  }
}
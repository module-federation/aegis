'use strict'

import { isMainThread } from 'worker_threads'
import executeCommand from './execute-command'
import fetchRelatedModels from './find-related-models'
import async from '../util/async-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../datasource').default} repository
 * @property {import('../event-broker').EventBroker} broker
 * @property {import('../model-factory').ModelFactory} models
 * @property {import('../thread-pool').ThreadPoolFactory} threadpool
 * @property {...Function} handlers
 */

/**
 * @callback findModel
 * @param {string} id
 * @param {{key1:string,keyN:string}} query,
 * @returns {Promise<import("../model").Model>}
 *
 * @param {ModelParam} param0
 * @returns {findModel}
 */
export default function makeFindModel({
  threadpool,
  repository,
  models,
  modelName,
  broker,
} = {}) {
  return async function findModel({ id, query, model }) {
    if (isMainThread) {
      // Main thread performs read operations
      const modelInst = await repository.find(id)

      if (!modelInst) {
        throw new Error('Not Found')
      }

      console.log({ fn: findModel.name, model: modelInst })
      // Only send to app thread if data must be enriched
      if (!query.relation && !query.command) return modelInst

      const input = { id, query, model: modelInst }
      return await threadpool.runJob(findModel.name, input, modelName)
    } else {
      try {
        const hydrateModel = model =>
          model.getId
            ? model // already unmarshalled
            : models.loadModel(broker, repository, model, modelName)

        // unmarshall the model so we can use it
        const hydratedModel = hydrateModel(model)

        if (query.relation) {
          const related = await async(
            fetchRelatedModels(hydratedModel, query.relation)
          )
          if (related.ok) {
            return related.data
          }
        }

        if (query.command) {
          const result = await async(
            executeCommand(
              hydratedModel,
              query.command,
              { args: query.args },
              'read'
            )
          )
          if (result.ok) {
            return result.data
          }
        }

        // gracefully degrade
        return hydratedModel
      } catch (error) {
        return new Error(error)
      }
    }
  }
}

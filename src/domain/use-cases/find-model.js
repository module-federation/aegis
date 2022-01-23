'use strict'

import { isMainThread } from 'worker_threads'
import executeCommand from './execute-command'
import fetchRelatedModels from './find-related-models'
import async from '../util/async-error'
import AegisError from '../util/aegis-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../datasource').default} repository
 * @property {import('../event-broker').EventBroker} broker
 * @property {import('../index').ModelFactory} models
 * @property {import('../thread-pool').ThreadPoolFactory} threadpool
 * @property {...Function} handlers
 */
/**
 * @callback findModel
 * @param {string} id
 * @param {{key1:string,keyN:string}} query
 * @returns {Promise<import("../model").Model>}
 *
 * @param {ModelParam} param0
 * @returns {findModel}
 */
export default function makeFindModel ({ repository, threadpool } = {}) {
  return async function findModel ({ id, query }) {
    if (isMainThread) {
      const result = await threadpool.run(findModel.name, { id, query })
      if (result.aegis) throw result
      return result
    } else {
      const model = await repository.find(id)

      if (!model) {
        return AegisError('no such id')
      }

      if (query?.relation) {
        const related = await async(fetchRelatedModels(model, query.relation))
        if (related.ok) {
          return related.data
        }
      }

      if (query?.command) {
        const result = await async(executeCommand(model, query.command, 'read'))
        if (result.ok) {
          return result.data
        }
      }

      return model
    }
  }
}

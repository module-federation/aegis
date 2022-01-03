'use strict'

import executeCommand from './execute-command'
import fetchRelatedModels from './find-related-models'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../datasource').default} repository
 * @property {import('../event-broker').EventBroker} broker
 * @property {import('../index').ModelFactory} models
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
export default function makeFindModel({ repository } = {}) {
  return async function findModel(id, query) {
    const model = await repository.find(id)

    if (!model) {
      throw new Error('no such id')
    }

    if (query?.relation) {
      const related = await fetchRelatedModels(model, query.relation)
      if (related) {
        return related
      }
    }

    if (query?.command) {
      const result = await executeCommand(model, query.command, 'read')
      if (result) {
        return result
      }
    }

    return model
  }
}

'use strict'

/**
 * @callback listModels
 * @param {{key1:string, keyN:string}} query
 * @returns {Promise<Array<import("../model").Model)>>}
 *
 * @param {{repository:import('../datasource').default}}
 * @returns {listModels}
 */
export default function makeListModels({ repository }) {
  return async function listModels({ query, writable }) {
    return repository.list({ query, writable, serialize: true })
  }
}

'use strict';

/**
 * @callback listModels
 * @param {{key1:string, keyN:string}} query
 * @returns {Promise<Array<import("../model").Model)>>}
 *
 * @param {{repository:import('../datasource').default}}
 * @returns {listModels}
 */
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeListModels;
function makeListModels({
  repository
}) {
  return async function listModels({
    query,
    writable
  }) {
    return repository.list({
      query,
      writable,
      serialize: true
    });
  };
}
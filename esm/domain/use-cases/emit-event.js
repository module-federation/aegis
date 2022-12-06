'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeEmitEvent;
var _worker_threads = require("worker_threads");
/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {import('../thread-pool').ThreadPool} threadpool
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} emitEvent
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
function makeEmitEvent({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  /**
   *
   * @param {{eventName:string,...}} input
   * @returns
   */
  return async function emitEvent(input) {
    try {
      if (_worker_threads.isMainThread) {
        try {
          await threadpool.fireEvent(input);
        } catch (error) {
          throw error;
        }
      } else {
        console.debug({
          pool: _worker_threads.workerData.poolName,
          fn: emitEvent.name,
          input
        });
        broker.notify(input.eventName, input);
      }
    } catch (error) {
      console.error({
        fn: emitEvent.name,
        error
      });
    }
  };
}
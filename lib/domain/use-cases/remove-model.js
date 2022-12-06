'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = removeModelFactory;
var _worker_threads = require("worker_threads");
var _appError = require("../util/app-error");
/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory} models
 * @property {import('../datasource').default} repository
 * @property {import('../event-broker').EventBroker} broker
 * @property {...Function} handlers
 */

/**
 * @callback removeModel
 * @param {string} id
 * @returns {Promise<import("..").Model>}
 */

/**
 * @param {ModelParam} param0
 * @returns {removeModel}
 */
function removeModelFactory({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.DELETE;
  const eventName = models.getEventName(eventType, modelName);
  handlers.forEach(handler => broker.on(eventName, handler));
  return async function removeModel({
    id
  }) {
    if (_worker_threads.isMainThread) {
      const model = await repository.find(id);
      if (!model) throw new Error('Not Found');
      return threadpool.runJob(removeModel.name, {
        id
      }, modelName);
    } else {
      try {
        const model = await repository.find(id);
        const deletedModel = models.deleteModel(model);
        const event = models.createEvent(eventType, modelName, deletedModel);
        broker.notify(eventName, event);
        await repository.delete(id);
        return deletedModel;
      } catch (error) {
        return (0, _appError.AppError)(error);
      }
    }
  };
}
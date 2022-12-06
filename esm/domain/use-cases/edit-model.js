'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeEditModel;
var _executeCommand = _interopRequireDefault(require("./execute-command"));
var _asyncError = _interopRequireDefault(require("../util/async-error"));
var _domainEvents = _interopRequireDefault(require("../domain-events"));
var _worker_threads = require("worker_threads");
var _appError = require("../util/app-error");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} editModel
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
function makeEditModel({
  modelName,
  models,
  repository,
  threadpool,
  broker,
  handlers = []
} = {}) {
  const eventType = models.EventTypes.UPDATE;
  const eventName = models.getEventName(eventType, modelName);
  handlers.forEach(handler => broker.on(eventName, handler));

  // Add an event that can be used to edit this model
  broker.on(_domainEvents.default.editModel(modelName), editModel);

  /**
   *
   * @param {{id:string,changes:object,command:string}} input
   * @returns
   */
  async function editModel(input) {
    if (_worker_threads.isMainThread) {
      const model = await repository.find(input.id);
      if (!model) throw new Error('Not Found');
      return threadpool.runJob(editModel.name, input, modelName);
    } else {
      try {
        // model has been found by main thread
        const {
          id,
          changes,
          command
        } = input;

        // get model
        const model = await repository.find(id);
        console.debug({
          model
        });

        // only the worker does the update
        const updated = await models.updateModel(model, changes);
        console.debug({
          updated
        });
        await repository.save(id, updated);
        const event = models.createEvent(eventType, modelName, {
          updated,
          changes
        });
        try {
          broker.notify(eventName, event);
          if (command) {
            const result = await (0, _asyncError.default)((0, _executeCommand.default)(updated, command, 'write'));
            if (result.ok) return result.data;
          }
          return await repository.find(id);
        } catch (error) {
          await repository.save(id, model);
          return (0, _appError.AppError)(error);
        }
      } catch (error) {
        return (0, _appError.AppError)(error);
      }
    }
  }
  return editModel;
}
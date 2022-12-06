'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
var _worker_threads = require("worker_threads");
var _nodeStream = require("node:stream");
var _serializer = _interopRequireDefault(require("../serializer"));
var _v = require("v8");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @param {function(import("..").Model)} loadModel
 * @param {import("../event-broker").EventBroker} broker
 * @param {import("../datasource").default} repository
 * @returns {function(Map<string,Model>|Model)}
 */
function hydrateModels(loadModel, broker, repository) {
  return function (saved) {
    if (!saved) return;
    try {
      if (saved instanceof Map) {
        return new Map([...saved].map(function ([k, v]) {
          const model = loadModel(broker, repository, v, v.modelName);
          return [k, model];
        }));
      }
      if (Object.getOwnPropertyNames(saved).includes('modelName')) {
        return loadModel(broker, repository, saved, saved.modelName);
      }
    } catch (error) {
      console.warn(hydrateModels.name, error.message);
    }
  };
}
function handleError(e) {
  console.error(e);
}
function startWorkflow(model) {
  const history = model.getPortFlow();
  const ports = model.getSpec().ports;
  if (history?.length > 0 && !model.compensate) {
    const lastPort = history.length - 1;
    const nextPort = ports[history[lastPort]].producesEvent;
    if (nextPort && history[lastPort] !== 'workflowComplete') {
      model.emit(nextPort, startWorkflow.name);
    }
  }
}

/**
 * deserialize and unmarshall from stream.
 * @typedef {import('..').Model}
 * @param {{
 *  models:import('../model-factory').ModelFactory,
 *  broker:import('../event-broker').EventBroker,
 *  repository:import('../datasource').default,
 *  modelName:string
 * }} options
 * @returns {function():Promise<void>}
 */
function _default({
  modelName,
  repository,
  broker,
  models
}) {
  // main thread only
  if (!_worker_threads.isMainThread) {
    console.log('loading cache ', modelName);
    const serializers = models.getModelSpec(modelName).serializers;
    const deserializers = serializers ? serializers.filter(s => !s.disabled && s.on === 'deserialize') : null;
    if (deserializers) deserializers.forEach(des => _serializer.default.addSerializer(des));
    const rehydrate = new _nodeStream.Transform({
      transform(chunk, _endcoding, next) {
        const model = models.loadModel(broker, repository, chunk, modelName);
        repository.saveSync(model.getId(), model);
        this.push(model);
        next();
      }
    });
    const resumeWorkflow = new _nodeStream.Writable({
      objectMode: true,
      write(chunk, _encoding, next) {
        startWorkflow(chunk);
        next();
      },
      end(chunk, _encoding, done) {
        startWorkflow(chunk);
        done();
      }
    });
    repository.list({
      transform: rehydrate,
      writable: resumeWorkflow
    });
  }
}
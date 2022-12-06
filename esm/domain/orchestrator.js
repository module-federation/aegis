'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WorkflowEmitter = void 0;
exports.generateWorkflow = generateWorkflow;
exports.resumeWorkflow = resumeWorkflow;
exports.runWorkflow = runWorkflow;
var _asyncError = _interopRequireDefault(require("./util/async-error"));
var _ = _interopRequireDefault(require("."));
var _datasourceFactory = _interopRequireDefault(require("./datasource-factory"));
var _eventBroker = _interopRequireDefault(require("./event-broker"));
var _events = _interopRequireDefault(require("events"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
async function generateWorkflow(options) {
  const {
    wfName,
    wfInput,
    wfTasks
  } = options;
  if (_.default.getModelSpec(wfName)) {
    console.warn(wfName, 'already registered');
    return;
  }

  /**
   * General workflow
   * @type {import(".").ModelSpecification}
   */
  const workflow = {
    modelName: wfName,
    endpoint: 'workflows',
    factory: () => dependencies => new Object.freeze({
      ...dependencies,
      ...wfInput
    }),
    ports: wfTasks
  };
  _.default.registerModel(workflow);
}
function runWorkflow({
  wfName
}) {
  const model = _.default.createModel(_eventBroker.default.getInstance(), _datasourceFactory.default.getSharedDataSource(wfName), wfName);
  model.emit(wfName);
  console.info(wfName, 'workflow started');
}

/**
 * Check `portFlow` history and resume any workflow
 * that was running before we shut down.
 *
 * @param {Array<import(".").Model>} list
 */
function resumeWorkflow(list) {
  if (list?.length > 0) {
    list.forEach(function (model) {
      const history = model.getPortFlow();
      const ports = model.getSpec().ports;
      if (history?.length > 0 && !model.compensate) {
        const lastPort = history.length - 1;
        const nextPort = ports[history[lastPort]].producesEvent;
        if (nextPort && history[lastPort] !== 'workflowComplete') {
          model.emit(nextPort, resumeWorkflow.name);
        }
      }
    });
  }
}
class WorkflowEmitter extends _events.default {}
exports.WorkflowEmitter = WorkflowEmitter;
const wfEvents = new WorkflowEmitter();
wfEvents.on('generateWorkflow', payload => {
  generateWorkflow(payload);
});
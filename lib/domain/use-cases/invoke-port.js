'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeInvokePort;
var _worker_threads = require("worker_threads");
var _appError = require("../util/app-error");
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
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} invokePort
 * @param {ModelParam} param0
 * @returns {function():Promise<im`port("../domain/model").Model>}
 */
function makeInvokePort({
  broker,
  repository,
  threadpool,
  modelName,
  models,
  context,
  authorize = async x => await x()
} = {}) {
  async function findModelService(id = null) {
    if (id) return repository.find(id);
    return models.getService(modelName, repository, broker);
  }
  /**
   *
   * @param {{id:String,model:import('..').Model,args:String[],port:String,method:String,headers:Array}} input
   * @returns
   */
  return async function invokePort(input) {
    if (_worker_threads.isMainThread) {
      return threadpool.runJob(invokePort.name, input, modelName);
    } else {
      try {
        let {
          id = null,
          port = null,
          method,
          path
        } = input;
        const service = await findModelService(id);
        if (!service) {
          throw new Error('could not find a service associated with given id');
        }
        const specPorts = service.getPorts();
        if (!port) {
          for (const p of Object.entries(specPorts)) {
            if (!p[1].path) {
              continue;
            }
            if (pathsMatch(p[1].path, path)) {
              port = p[0];
              break;
            }
          }
        }
        if (!port) {
          throw new Error('the port is undefined');
        }
        if (!service[port]) {
          throw new Error('the port or record ID is invalid');
        }
        const specPortMethods = specPorts[port]?.methods?.join('|')?.toLowerCase();
        if (specPortMethods && !specPortMethods.includes(method.toLowerCase())) {
          throw new Error('invalid method for given port');
        }
        if (specPorts[port]?.path && !pathsMatch(specPorts[port].path, path)) {
          throw new Error('invalid path for given port');
        }
        return await service[port](input);
      } catch (error) {
        return (0, _appError.AppError)(error);
      }
    }
  };
}

// Performant way of checking if paths are the same
// given one path with params and one with the param pattern
// this accounts for route params
// since a route param can be anything, we can just compare 
/// each path segment skipping over the param field
function pathsMatch(pathWithParamRegex, pathWithParams) {
  const splitPathWithParams = pathWithParams.split('/');
  const splitPathWithParamRegex = pathWithParamRegex.split('/');

  // We know if the length is different, the paths are different
  if (splitPathWithParams.length !== splitPathWithParamRegex.length) {
    return false;
  }

  // we loop through the path with params and check if the path with param regex and the called path match
  // if they do not match, we return false
  // if we get to a segment with a route param we continue
  // if we get to the end of the loop and all segments match, we return true
  for (let index = 0; index < splitPathWithParams.length; index++) {
    const param = splitPathWithParams[index];
    const paramRegex = splitPathWithParamRegex[index];

    // regex path includes colon meaning route param so we continue
    if (paramRegex.includes(':')) {
      continue;
    }

    // if not equal, we return false the paths don't match
    if (param !== paramRegex) {
      return false;
    }
  }
  return true;
}
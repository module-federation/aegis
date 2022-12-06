'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UseCaseService = UseCaseService;
exports.UseCases = void 0;
exports.getUserRoutes = getUserRoutes;
exports.makeDomain = makeDomain;
exports.modelsInDomain = modelsInDomain;
exports.registerEvents = registerEvents;
exports.serviceMeshPlugin = void 0;
var _modelFactory = _interopRequireDefault(require("../model-factory"));
var _datasourceFactory = _interopRequireDefault(require("../datasource-factory"));
var _threadPool = _interopRequireDefault(require("../thread-pool.js"));
var _eventBroker = _interopRequireDefault(require("../event-broker"));
var _createModel = _interopRequireDefault(require("./create-model"));
var _editModel = _interopRequireDefault(require("./edit-model"));
var _listModels = _interopRequireDefault(require("./list-models"));
var _findModel = _interopRequireDefault(require("./find-model"));
var _removeModel = _interopRequireDefault(require("./remove-model"));
var _loadModels = _interopRequireDefault(require("./load-models"));
var _deployModel = _interopRequireDefault(require("./deploy-model"));
var _listConfigs = _interopRequireDefault(require("./list-configs"));
var _emitEvent = _interopRequireDefault(require("./emit-event"));
var _invokePort = _interopRequireDefault(require("./invoke-port"));
var _hotReload = _interopRequireDefault(require("./hot-reload"));
var _brokerEvents = _interopRequireDefault(require("./broker-events"));
var _distributedCache = _interopRequireDefault(require("../distributed-cache"));
var _createServiceMesh = _interopRequireDefault(require("./create-service-mesh.js"));
var _domainEvents = _interopRequireDefault(require("../domain-events"));
var _eventRouter = require("../event-router");
var _worker_threads = require("worker_threads");
var _config = require("../../config");
var _appError = require("../util/app-error");
var context = _interopRequireWildcard(require("../util/async-context"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const serviceMeshPlugin = _config.hostConfig.services.activeServiceMesh || process.env.SERVICE_MESH_PLUGIN || 'webswitch';
exports.serviceMeshPlugin = serviceMeshPlugin;
function registerEvents() {
  // main thread handles event dispatch
  (0, _brokerEvents.default)({
    broker: _eventBroker.default.getInstance(),
    datasources: _datasourceFactory.default,
    models: _modelFactory.default,
    threadpools: _threadPool.default,
    PortEventRouter: _eventRouter.PortEventRouter,
    DistributedCache: _distributedCache.default,
    createServiceMesh: makeOne(serviceMeshPlugin, _createServiceMesh.default, {
      internal: true
    })
  });
}
function modelsInDomain(domain) {
  return _modelFactory.default.getModelSpecs().filter(s => s.domain && s.domain.toUpperCase() === domain.toUpperCase()).map(s => s.modelName.toUpperCase());
}

/**
 *
 * @param {*} modelName
 * @returns {import('..').ModelSpecification[]}
 */
function findLocalRelatedModels(modelName) {
  const targetModel = _modelFactory.default.getModelSpec(modelName);
  const localModels = _modelFactory.default.getModelSpecs().map(s => s.modelName);
  const byRelation = !targetModel?.relations ? [] : Object.keys(targetModel.relations).map(k => targetModel.relations[k].modelName.toUpperCase()).filter(modelName => localModels.includes(modelName));
  const byDomain = modelsInDomain(targetModel.domain);
  return {
    byDomain: () => byDomain,
    byRelation: () => byRelation,
    toNames: () => byRelation.concat(byDomain),
    toSpecs: () => byRelation.concat(byDomain).map(modelName => _modelFactory.default.getModelSpec(modelName))
  };
}

/**
 *
 * @param {*} modelName
 * @returns
 */
function findLocalRelatedDatasources(spec) {
  return findLocalRelatedModels(spec.modelName).toSpecs().map(s => ({
    modelName: s.modelName,
    dsMap: getDataSource(s).dsMap
  }));
}
function getDataSource(spec, options) {
  return _datasourceFactory.default.getSharedDataSource(spec.modelName, spec.domain, options);
}
function getThreadPool(spec, ds, options) {
  if (spec.internal) return null;
  return _threadPool.default.getThreadPool(spec.domain, {
    ...options,
    preload: false,
    sharedMap: ds.dsMap,
    dsRelated: findLocalRelatedDatasources(spec)
  });
}

/**
 *
 * @param {import('..').ModelSpecification} spec
 */
function buildOptions(spec, options) {
  const invariant = {
    modelName: spec.modelName,
    models: _modelFactory.default,
    broker: _eventBroker.default.getInstance(),
    handlers: spec.eventHandlers,
    context,
    isMainThread: _worker_threads.isMainThread,
    domainEvents: _domainEvents.default,
    AppError: _appError.AppError
  };
  if (_worker_threads.isMainThread) {
    const ds = getDataSource(spec, options);
    return {
      ...invariant,
      // main thread does not write to persistent store
      repository: ds,
      // only main thread knows about thread pools (no nesting)
      threadpool: getThreadPool(spec, ds, options),
      // if caller provides id, use it as key for idempotency
      async enforceIdempotency() {
        const duplicateRequest = await ds.find(context.requestContext.getStore().get('id'));
        console.info('check idempotency-key: is this a duplicate?', duplicateRequest ? 'yes' : 'no');
        return duplicateRequest;
      }
    };
  } else {
    return {
      ...invariant,
      // only worker threads can write to persistent storage
      repository: getDataSource(spec, options)
    };
  }
}

/**
 * Generate use case functions for every model
 * @param {string} modelName
 * @param {function({}):function():Promise<Model>} factory
 * @returns
 */
function make(factory) {
  const specs = _modelFactory.default.getModelSpecs();
  return specs.map(spec => ({
    endpoint: spec.endpoint,
    path: spec.path,
    ports: spec.ports,
    fn: factory(buildOptions(spec))
  }));
}

/**
 * Generate use case functions for just one model
 * @param {string} modelName
 * @param {function({}):function():Promise<Model>} factory
 * @returns
 */
function makeOne(modelName, factory, options = {}) {
  const spec = _modelFactory.default.getModelSpec(modelName.toUpperCase(), options);
  return factory(buildOptions(spec, spec.domain));
}
const createModels = () => make(_createModel.default);
const editModels = () => make(_editModel.default);
const listModels = () => make(_listModels.default);
const findModels = () => make(_findModel.default);
const removeModels = () => make(_removeModel.default);
const loadModels = () => make(_loadModels.default);
const emitEvents = () => make(_emitEvent.default);
const deployModels = () => make(_deployModel.default);
const invokePorts = () => make(_invokePort.default);
const hotReload = () => [{
  endpoint: 'reload',
  fn: (0, _hotReload.default)({
    models: _modelFactory.default,
    broker: _eventBroker.default.getInstance()
  })
}];
const listConfigs = () => (0, _listConfigs.default)({
  models: _modelFactory.default,
  broker: _eventBroker.default.getInstance(),
  datasources: _datasourceFactory.default,
  threadpools: _threadPool.default
});

/**
 * Expose domain ports
 *
 * @param {*} modelName
 */
const domainPorts = modelName => ({
  ...UseCaseService(modelName),
  eventBroker: _eventBroker.default.getInstance(),
  modelSpec: _modelFactory.default.getModelSpec(modelName),
  dataSource: _datasourceFactory.default.getDataSource(modelName)
});

/**
 *returns
 * @param {*} fn
 * @param {*} ports
 * @
 */
const userController = (fn, ports) => async (req, res) => {
  try {
    return await fn(req, res, ports);
  } catch (error) {
    console.error({
      fn: userController.name,
      error
    });
    res.status(500).json({
      msg: 'error occurred',
      error
    });
  }
};

/**
 * Extract user-defined endpoints from the modelSpec and
 * decorate the user's callback such that it includes a
 * third argument, which is a set of inbound port functions
 * for he user to call.
 *
 * @returns {import('../index').endpoint}
 */
function getUserRoutes() {
  try {
    return _modelFactory.default.getModelSpecs().filter(spec => spec.routes).map(spec => spec.routes.filter(route => route).map(route => {
      const api = domainPorts(spec.modelName);
      return Object.keys(route).map(key => typeof route[key] === 'function' ? {
        [key]: userController(route[key], api)
      } : {
        [key]: route[key]
      }).reduce((a, b) => ({
        ...a,
        ...b
      }));
    })).flat();
  } catch (error) {
    console.error({
      fn: getUserRoutes.name,
      error
    });
  }
}
const UseCases = {
  createModels,
  editModels,
  listModels,
  findModels,
  removeModels,
  loadModels,
  listConfigs,
  hotReload,
  registerEvents,
  emitEvents,
  deployModels,
  invokePorts
};

/**
 * This service contains the set of inbound ports
 * handling all CRUD operations for domain models.
 * An alias for the service could be "InboundPorts"
 *
 * @param {string} modelName
 * @returns
 */
exports.UseCases = UseCases;
function UseCaseService(modelName) {
  if (typeof modelName === 'string') {
    const modelNameUpper = modelName.toUpperCase();
    return {
      createModel: makeOne(modelNameUpper, _createModel.default),
      editModel: makeOne(modelNameUpper, _editModel.default),
      listModels: makeOne(modelNameUpper, _listModels.default),
      findModel: makeOne(modelNameUpper, _findModel.default),
      removeModel: makeOne(modelNameUpper, _removeModel.default),
      loadModels: makeOne(modelNameUpper, _loadModels.default),
      emitEvent: makeOne(modelNameUpper, _emitEvent.default),
      deployModel: makeOne(modelNameUpper, _deployModel.default),
      invokePort: makeOne(modelNameUpper, _invokePort.default),
      listConfigs: listConfigs()
    };
  }
}
function makeDomain(domain) {
  if (!domain) throw new Error('no domain provided');
  return modelsInDomain(domain.toUpperCase()).map(modelName => ({
    [modelName]: UseCaseService(modelName)
  })).reduce((a, b) => ({
    ...a,
    ...b
  }), {});
}
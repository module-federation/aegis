'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRoutes = exports.getModelsById = exports.getModels = exports.getConfig = exports.deleteModels = exports.anyInvokePorts = void 0;
Object.defineProperty(exports, "http", {
  enumerable: true,
  get: function () {
    return _httpAdapter.default;
  }
});
exports.postModels = exports.patchModels = exports.liveUpdate = exports.initCache = void 0;
var _useCases = require("../../domain/use-cases");
var _postModel = _interopRequireDefault(require("./post-model"));
var _patchModel = _interopRequireDefault(require("./patch-model"));
var _getModels = _interopRequireDefault(require("./get-models"));
var _getModelById = _interopRequireDefault(require("./get-model-by-id"));
var _deleteModel = _interopRequireDefault(require("./delete-model"));
var _getConfig = _interopRequireDefault(require("./get-config"));
var _postInvokePort = _interopRequireDefault(require("./post-invoke-port"));
var _liveUpdate = _interopRequireDefault(require("./live-update"));
var _httpAdapter = _interopRequireDefault(require("./http-adapter"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const {
  createModels,
  editModels,
  findModels,
  listConfigs,
  loadModels,
  listModels,
  removeModels,
  hotReload,
  registerEvents,
  invokePorts
} = _useCases.UseCases;
function make(useCases, controllerFactory) {
  return useCases().map(uc => ({
    endpoint: uc.endpoint,
    path: uc.path,
    ports: uc.ports,
    fn: controllerFactory(uc.fn)
  }));
}
const postModels = () => make(createModels, _postModel.default);
exports.postModels = postModels;
const patchModels = () => make(editModels, _patchModel.default);
exports.patchModels = patchModels;
const getModels = () => make(listModels, _getModels.default);
exports.getModels = getModels;
const getModelsById = () => make(findModels, _getModelById.default);
exports.getModelsById = getModelsById;
const deleteModels = () => make(removeModels, _deleteModel.default);
exports.deleteModels = deleteModels;
const anyInvokePorts = () => make(invokePorts, _postInvokePort.default);
exports.anyInvokePorts = anyInvokePorts;
const liveUpdate = () => make(hotReload, _liveUpdate.default);
exports.liveUpdate = liveUpdate;
const getConfig = () => (0, _getConfig.default)(listConfigs());
exports.getConfig = getConfig;
const getRoutes = () => (0, _useCases.getUserRoutes)();
exports.getRoutes = getRoutes;
const initCache = () => {
  const label = '\ntime to load cache';
  const specs = loadModels();
  registerEvents();
  async function loadModelInstances() {
    console.time(label);
    await Promise.allSettled(specs.map(async m => m && m.fn ? m.fn() : false));
    console.timeEnd(label);
  }
  return {
    load: () => loadModelInstances()
  };
};
exports.initCache = initCache;
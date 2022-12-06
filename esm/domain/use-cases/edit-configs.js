'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = editConfigsFactory;
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const configPath = process.env.CONFIG_PATH;
function validateConfigs(configs) {
  const valid = Array.isArray(config) && configs.every(config => config.url && config.name && config.path);
  if (!valid) throw new Error('invalid config');
}
function listConfigs() {
  if (_fs.default.existsSync(configPath)) {
    return _fs.default.readFileSync(configPath, 'utf-8');
  }
}
function saveConfigs(configs) {
  const unique = configs.reduce((p, c) => ({
    ...p,
    ...c
  }));
  const merged = {
    ...Object.fromEntries(listConfigs()),
    ...unique
  };
  _fs.default.writeFileSync(JSON.stringify(Object.entries(merged)));
}

/**
 * @param {{
 * models:import("../domain/model").Model,
 * data:import("../domain/datasource-factory").DataSourceFactory
 * }} options
 */
function editConfigsFactory({
  models
} = {}) {
  return async function editConfigs(configs) {
    validateConfigs(configs);
    saveConfigs(configs);
    return {
      message: 'server config updated'
    };
  };
}
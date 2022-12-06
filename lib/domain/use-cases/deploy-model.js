"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeDeployModel;
exports.makeRegisterRemote = makeRegisterRemote;
var _index = require("../index.js");
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const config = ''; // require(path.join(process.cwd(), 'wepack.config.js'))
const webpack = require('webpack');
const fs = require('fs');

//.const compiler = webpack(config)

// `compiler.run()` doesn't support promises yet, only callbacks
async function compile() {
  // await new Promise((resolve, reject) => {
  //   compiler.run((err, res) => {
  //     if (err) {
  //       return reject(err)
  //     }
  //     resolve(res)
  //   })
  // })
}
function makeRegisterRemote() {
  /**
   * Process new remote entry.
   * @param {import('../../../webpack/remote-entries-type.js').remoteEntry} remoteEntry
   */
  return async function registerRemote(remoteEntry) {
    if (!remoteEntry?.name) throw new Error('no remote entry provided');
    const newFile = remoteEntry.name.concat('.js');
    if (fs.existsSync(newFile)) throw new Error('remote entry file already exists' + newFile);
    try {
      fs.writeFileSync(_path.default.resolve(process.cwd(), 'webpack/remote-entries', newFile), JSON.stringify(remoteEntry), {
        encoding: 'utf-8'
      });
      const indexFile = _path.default.resolve(process.cwd(), 'webpack/remote-entries', 'index.js');
      const remoteExports = fs.readFileSync(indexFile, {
        encoding: 'utf-8'
      });
      fs.writeFileSync(indexFile, remoteExports.concat(`export * from './${newFile}'\n`), {
        encoding: 'utf-8'
      });
      await compile();
    } catch (error) {
      console.error({
        fn: registerRemote.name,
        error
      });
    }
  };
}

/**
 *
 * @param {{models:import('../model-factory.js').ModelFactory}} param0
 * @returns
 */
function makeDeployModel({
  models
}) {
  /**
   * Handle deployment request.
   *
   * Can come from:
   *  - source repo during rollout of new model
   *  - remote aegis instance during scale out or adaptive deployment
   *
   * @param {*} modelName
   */
  return function deployModel(modelName) {
    if (!modelName) throw new Error('missing modelName');
    const modelNameUpper = modelName.toUpperCase();
    if (models.getModelSpec(modelNameUpper)) return;
    (0, _index.importRemoteCache)(modelNameUpper);
    if (!models.getModelSpec(modelNameUpper)) throw new Error('model could not be loaded');
  };
}
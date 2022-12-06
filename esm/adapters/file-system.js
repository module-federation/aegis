"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.writeFile = writeFile;
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function writeFile(_service) {
  return async function (options) {
    const {
      model,
      args: [callback]
    } = options;
    try {
      model.files.forEach(file => _fs.default.writeFileSynch(file.path, file.data));
    } catch (e) {
      console.error(provisonCert.name, e);
    }
  };
}
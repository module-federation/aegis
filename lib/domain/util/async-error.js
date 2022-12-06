'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = async;
var _makeArray = _interopRequireDefault(require("./make-array"));
var _makeObject = _interopRequireDefault(require("./make-object"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * async wrapper - catch and log errors,
 * return predictable response
 * @param {Promise} promise
 */
function async(promise) {
  return promise.then(data => ({
    ok: true,
    data,
    asObject: () => (0, _makeObject.default)(data),
    asArray: () => (0, _makeArray.default)(data)
  })).catch(error => {
    console.error(error);
    return Promise.resolve({
      ok: false,
      error
    });
  });
}
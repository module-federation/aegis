"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = hash;
var _crypto = _interopRequireDefault(require("crypto"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function hash(data) {
  return _crypto.default.createHash('sha1').update(data).digest('hex');
}
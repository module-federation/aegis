'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeArray;
function makeArray(v) {
  return Array.isArray(v) ? v : [v];
}
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeObject;
function makeObject(prop) {
  if (Array.isArray(prop)) {
    return prop.reduce((p, c) => ({
      ...p,
      ...c
    }));
  }
  return prop;
}
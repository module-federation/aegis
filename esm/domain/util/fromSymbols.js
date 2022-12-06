"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromGlobalSymbols = fromGlobalSymbols;
exports.fromSymbols = fromSymbols;
/**
 * Convert symbols in `obj` to functions
 *
 * @param {*} obj
 * @returns
 */
function fromSymbols(obj) {
  return Object.getOwnPropertySymbols(obj).map(s => ({
    [obj[s].name.split('[').join('').split(']').join('')]: obj[s]
  })).reduce((a, b) => ({
    ...a,
    ...b
  }));
}
function fromGlobalSymbols(obj) {
  return Object.getOwnPropertySymbols(obj).map(s => ({
    [Symbol.keyFor(s).split('.')[1]]: obj[s]
  })).reduce((a, b) => ({
    ...a,
    ...b
  }));
}
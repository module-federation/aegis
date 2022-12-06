"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  adapterTypes: true,
  wasmAdapters: true
};
exports.wasmAdapters = exports.adapterTypes = void 0;
var _wasmDecorators = require("./wasm-decorators");
var _wasmInterop = require("./wasm-interop");
Object.keys(_wasmInterop).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _wasmInterop[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _wasmInterop[key];
    }
  });
});
var _repoClient = require("./repo-client");
Object.keys(_repoClient).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _repoClient[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _repoClient[key];
    }
  });
});
var _wasmImport = require("./wasm-import");
Object.keys(_wasmImport).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _wasmImport[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _wasmImport[key];
    }
  });
});
//export * from './wasm-import-old'

/** @typedef  {'adapter'|'service'|'model'} adapterType */

/**
 * @enum
 */
const adapterTypes = {
  /** @type {adapterType} */
  model: 'model',
  /** @type {adapterType} */
  adapter: 'adapter',
  /** @type {adapterType} */
  service: 'service'
};
exports.adapterTypes = adapterTypes;
const wasmAdapters = {
  /**
   * @param {WebAssembly.Exports} wasm
   */
  model: wasm => (0, _wasmDecorators.wrapWasmModelSpec)(wasm),
  /**
   * @param {WebAssembly.Exports} wasm
   */
  adapter: wasm => (0, _wasmDecorators.wrapWasmAdapter)(wasm),
  /**
   * @param {WebAssembly.Exports} wasm
   */
  service: wasm => (0, _wasmDecorators.wrapWasmService)(wasm)
};
exports.wasmAdapters = wasmAdapters;
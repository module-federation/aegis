'use strict'

const exports = require('webpack')
const { WasmInterop } = require('./wasm-interop')

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap the WASM Module as a {@link ModelSpecification}
 * @param {WebAssembly.Exports} wasmExports WebAssembly module instance
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = function (wasmExports) {
  const {
    getModelName,
    getEndpoint,
    getDomain,
    modelFactory,
    onUpdate,
    onDelete,
    validate
  } = wasmExports

  const interop = WasmInterop(wasmExports)

  // wrapped model spec
  const wrappedSpec = {
    modelName: getModelName(),
    endpoint: getEndpoint(),
    domain: getDomain(),
    /**
     * Pass any dependencies, return factory function that creates model
     * @param {*} dependencies
     * @returns {({...arg} => Model)} factory function to generate model
     */
    factory: dependencies => input => modelFactory(input),
    //validate: (model, changes) => validate(model, changes),
    onUpdate: (model, changes) => onUpdate(model, changes),
    onDelete: model => onDelete(model),
    commands: {
      ...interop.importWasmCommands()
    },
    ports: {
      ...interop.importWasmPorts()
    },
    portFunctions: {
      ...interop.importWasmPortFunctions()
    }
  }
  console.debug(wrappedSpec)

  return Object.freeze(wrappedSpec)
}

/**
 *
 * @param {WebAssembly.Exports} exports
 * @returns {Adapter}
 */
exports.wrapWasmAdapter = function (exports) {
  const interop = WasmInterop(exports)

  return Object.keys(exports)
    .filter(k => typeof exports[k] === 'function' && /adapter/i.test(k))
    .map(k => ({
      [k.replace('adapter', '')]: service => (model, args = []) =>
        service
          ? interop.callWasmFunction(service[k], args[0] || model)
          : interop.callWasmFunction(k, args[0] || model)
    }))
    .reduce((a, b) => ({ ...a, ...b }))
}

/**
 *
 * @param {WebAssembly.Exports} exports
 * @returns {Service}
 */
exports.wrapWasmService = function (exports) {
  return {
    [exports.getName()]: Object.keys(exports)
      .filter(k => typeof exports[k] === 'function' && /service/i.test(k))
      .map(k => ({ [k]: x => callWasmFunction(k, x) }))
      .reduce((a, b) => ({ ...a, ...b }))
  }
}

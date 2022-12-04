'use strict'

const { dependencies } = require('webpack')
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
 * @param {WebAssembly.Instance} instance
 * @returns {Adapter}
 */
exports.wrapWasmAdapter = function (instance) {
  const { invoke } = instance.exports
  const interop = WasmInterop(instance)

  return function (service) {
    return async function (options) {
      const { model } = options
      const adapter = interop.callWasmFunction(invoke, model)

      if (service) {
        interop.callWasmFunction(service[adapter.serviceFn], model)
      }
    }
  }
}

/**
 *
 * @param {WebAssembly.Instance} instance
 * @returns {Service}ww w
 */
exports.wrapWasmService = function (instance) {
  const { makeService } = instance.exports
  return WasmInterop(instance).callWasmFunction(makeService)
}

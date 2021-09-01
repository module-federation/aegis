'use strict'

import WasmInterop from './wasm-interop'

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap wasm factory function, etc in {@link ModelSpecification}
 * @param {import("node:module")} module WebAssembly module
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = function (module) {
  const adapter = WasmInterop(module)

  const {
    test,
    __pin,
    __getString,
    ModelSpec,
    getModelSpec,
    modelFactory
  } = module.exports

  const specPtr = __pin(getModelSpec())
  const modelSpec = ModelSpec.wrap(specPtr)

  // wrapped model spec
  const wrappedSpec = {
    modelName: __getString(modelSpec.modelName),
    endpoint: __getString(modelSpec.endpoint),
    test: () => adapter.callWasmFunction(test, { key1: 'val1', c: 'd' }),
    /**
     * Pass any dependencies, return factory function that creates model
     * @param {*} dependencies
     * @returns {({...arg}=>Model)} factory function to generate model
     */
    factory: dependencies => async input =>
      adapter.callWasmFunction(modelFactory, { ...dependencies, ...input }),

    onUpdate: (model, changes) =>
      callWasmFunction(module.exports.onUpdate, { model, changes }),

    onDelete: model =>
      adapter.callWasmFunction(module.exports.onDelete, model, false),

    commands: {
      ...adapter.configureWasmCommands()
    },

    ports: {
      ...adapter.configureWasmPorts()
    },

    // call to dispose of spec memory
    dispose: () => __unpin(specPtr)
  }
  console.debug(wrappedSpec)
  return Object.freeze(wrappedSpec)
}

/**
 *
 * @param {import("node:module")} module
 * @returns {Adapter}
 */
export function wrapWasmAdapter (module) {}

/**
 *
 * @param {import("node:module")} module
 * @returns {Service}
 */
export function wrapWasmService (module) {}

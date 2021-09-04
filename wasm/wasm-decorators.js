'use strict'

const WasmInterop = require('./wasm-interop').WasmInterop

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
    modelFactory,
    __getString,
    __pin,
    getModelSpec,
    ModelSpec
  } = module.exports

  const specPtr = __pin(getModelSpec())
  const modelSpec = ModelSpec.wrap(specPtr)

  // wrapped model spec
  return Object.freeze({
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
      callWasmFunction(wam.exports.onUpdate, changes),

    onDelete: model =>
      adapter.callWasmFunction(module.exports.onDelete, model, false),

    validate: model =>
      adapter.callWasmFunction(module.exports.validate, model, false),

    commands: {
      ...adapter.getWasmCommands()
    },

    ports: {
      ...adapter.getWasmPorts()
    }

    // call to dispose of spec memory
    // dispose: () => adapter.dispose(),
  })
}

/**
 *
 * @param {import("node:module")} module
 * @returns {Adapter}
 */
exports.wrapWasmAdapter = function (module) {}

/**
 *
 * @param {import("node:module")} module
 * @returns {Service}
 */
exports.wrapWasmService = function (module) {}

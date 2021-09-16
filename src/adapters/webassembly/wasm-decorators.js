'use strict'

const WasmInterop = require('./wasm-interop').WasmInterop

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap the WASM Module  {@link ModelSpecification}
 * @param {import("node:module")} module WebAssembly module
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = function (module) {
  const adapter = WasmInterop(module)
  const {
    __unpin,
    __pin,
    __getString,
    ModelSpec,
    getModelSpec,
    modelFactory,
    validate,
    onUpdate,
    onDelete
  } = module.exports

  const specPtr = __pin(getModelSpec())
  const modelSpec = ModelSpec.wrap(specPtr)

  // wrapped model spec
  const wrappedSpec = {
    modelName: __getString(modelSpec.modelName),
    endpoint: __getString(modelSpec.endpoint),

    /**
     * Pass any dependencies, return factory function that creates model
     * @param {*} dependencies
     * @returns {({...arg}=>Model)} factory function to generate model
     */
    factory: dependencies => async input =>
      adapter.callWasmFunction(modelFactory, { ...dependencies, ...input }),

    // validate: (model, changes) =>
    //   adapter.callWasmFunction(validate, { model, changes }, false),

    onUpdate: (model, changes) =>
      adapter.callWasmFunction(onUpdate, { model, changes }),

    onDelete: model => adapter.callWasmFunction(onDelete, model),

    commands: {
      ...adapter.exportWasmCommands()
    },

    ports: {
      ...adapter.exportWasmPorts()
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
exports.wrapWasmAdapter = function (module) {}

/**
 *
 * @param {import("node:module")} module
 * @returns {Service}
 */
exports.wrapWasmService = function (module) {}

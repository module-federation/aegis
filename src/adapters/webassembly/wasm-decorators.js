'use strict'

const { WasmInterop } = require('./wasm-interop')

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap the WASM Module as a {@link ModelSpecification}
 * @param {WebAssembly.Instance} instance WebAssembly module instance
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = function (instance) {
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
  } = instance.exports

  const interop = WasmInterop(instance)
  const specPtr = __pin(getModelSpec())
  const modelSpec = ModelSpec.wrap(specPtr)

  // wrapped model spec
  const wrappedSpec = {
    modelName: __getString(modelSpec.modelName),
    endpoint: __getString(modelSpec.endpoint),

    /**
     * Pass any dependencies, return factory function that creates model
     * @param {*} dependencies
     * @returns {({...arg} => Model)} factory function to generate model
     */
    factory: dependencies => async input =>
      interop.callWasmFunction(modelFactory, { ...dependencies, ...input }),

    // validate: (model, changes) =>
    //   adapter.callWasmFunction(validate, { model, changes }, false),

    onUpdate: (model, changes) =>
      interop.callWasmFunction(onUpdate, { model, changes }),

    onDelete: model => interop.callWasmFunction(onDelete, model),

    commands: {
      ...interop.importWasmCommands()
    },

    ports: {
      ...interop.importWasmPorts()
    },

    // call to dispose of spec memory
    dispose: () => __unpin(specPtr)
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
 * @returns {Service}
 */
exports.wrapWasmService = function (instance) {
  const { makeService } = instance.exports
  return WasmInterop(instance).callWasmFunction(makeService)
}

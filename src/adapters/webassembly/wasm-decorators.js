'use strict'

const { WasmInterop } = require('./wasm-interop')

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap the WASM Module as a {@link ModelSpecification}
 * @param {WebAssembly.Instance} module WebAssembly module instance
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = function (module) {
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

  const adapter = WasmInterop(module)
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
      adapter.callWasmFunction(modelFactory, { ...dependencies, ...input }),

    // validate: (model, changes) =>
    //   adapter.callWasmFunction(validate, { model, changes }, false),

    onUpdate: (model, changes) =>
      adapter.callWasmFunction(onUpdate, { model, changes }),

    onDelete: model => adapter.callWasmFunction(onDelete, model),

    commands: {
      ...adapter.importWasmCommands()
    },

    ports: {
      ...adapter.importWasmPorts()
    },

    // call to dispose of spec memory
    dispose: () => __unpin(specPtr)
  }
  console.debug(wrappedSpec)

  return Object.freeze(wrappedSpec)
}

/**
 *
 * @param {WebAssembly.Instance} module
 * @returns {Adapter}
 */
exports.wrapWasmAdapter = function (module) {
  const { __getString, getAdapterName, execAdapter } = module.exports
  const adapter = WasmInterop(module)
  const adapterName = __getString(getAdapterName())

  return ([adapterName] = service => async options => {
    let serviceOut
    if (service) serviceOut = await service[adapterName](options)
    const adapterOut = await adapter.callWasmFunction(execAdapter, serviceOut)
    if (options.args.callback) await options.args.callback(options, adapterOut)
  })
}

/**
 *
 * @param {WebAssembly.Instance} module
 * @returns {Service}
 */
exports.wrapWasmService = function (module) {
  const { makeService } = module.exports
  const adapter = WasmInterop(module)

  return Object.freeze(adapter.callWasmFunction(makeService))
}

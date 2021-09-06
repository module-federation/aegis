'use strict'

const WasmInterop = require('./wasm-interop').WasmInterop
const RepoClient = require('./wasm-import').RepoClient
const loader = require('@assemblyscript/loader')

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * Wrap the WASM Module  {@link ModelSpecification}
 * @param {import("node:module")} module WebAssembly module
 * @returns {ModelSpecification}
 */
exports.wrapWasmModelSpec = async function (module, remoteEntry) {
  const adapter = WasmInterop(module)
  const {
    __getString,
    modelName,
    endpoint,
    modelFactory,
    validate,
    onUpdate,
    onDelete
  } = module.exports

  const client = RepoClient(remoteEntry)
  let models = []

  // wrapped model spec
  const ModelSpecWrapper = {
    modelName: __getString(modelName),
    endpoint: __getString(endpoint),

    /**
     * Pass any dependencies, return factory function that creates model
     * @param {*} dependencies
     * @returns {({...arg}=>Model)} factory function to generate model
     */
    factory: dependencies => async input =>
      loader
        .instantiate(dependencies.wasmModel, {
          ...importObject,
          ...{
            fn: x => x
          }
        })
        .then(({ exports }) => {
          const model = adapter.callWasmFunction(exports.modelFacory(input))
          models.push(model)
          return model
        }),

    onUpdate: (model, changes) =>
      adapter.callWasmFunction(onUpdate, { model, changes }),

    onDelete: model => adapter.callWasmFunction(onDelete, model, false),

    dependencies: {
      wasmModule: await client.getModel()
    },

    commands: {
      ...adapter.configureWasmCommands()
    },

    ports: {
      ...adapter.configureWasmPorts()
    },

    // call to unpin any memory
    dispose: () => console.warn('dispose unimplemented')
  }
  console.debug(ModelSpecWrapper)

  return Object.freeze(ModelSpecWrapper)
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

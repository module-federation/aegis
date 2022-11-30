import {
  wrapWasmAdapter,
  wrapWasmModelSpec,
  wrapWasmService
} from './wasm-decorators'
//export * from './wasm-import-old'
export * from './wasm-interop'
export * from './repo-client'
export * from './wasm-import'

/** @typedef  {'adapter'|'service'|'model'} adapterType */

/**
 * @enum
 */
export const adapterTypes = {
  /** @type {adapterType} */
  model: 'model',
  /** @type {adapterType} */
  adapter: 'adapter',
  /** @type {adapterType} */
  service: 'service'
}

export const wasmAdapters = {
  /**
   * @param {WebAssembly.Instance} wasm
   */
  model: wasm => wrapWasmModelSpec(wasm),
  /**
   * @param {WebAssembly.Instance} wasm
   */
  adapter: wasm => wrapWasmAdapter(wasm),
  /**
   * @param {WebAssembly.Instance} wasm
   */
  service: wasm => wrapWasmService(wasm)
}

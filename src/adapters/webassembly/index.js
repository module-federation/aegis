'use strict'

import {
  wrapWasmAdapter,
  wrapWasmModelSpec,
  wrapWasmService
} from './wasm-wrap'

export * from './wasm-interop'
export * from './wasm-import'
export * from './repo-client'
export * from './wasm-import'

/**
 *
 */
export const adapterTypes = {
  model: 'model',
  adapter: 'adapter',
  service: 'service',
}

export const wasmAdapters = {
  /**
   * @param {WebAssembly.Exports} wasm
   * @returns {import('./wasm-wrap').ModelSpecification}
   */
  [adapterTypes.model]: wasm => wrapWasmModelSpec(wasm),
  /**
   * @param {WebAssembly.Exports} wasm
   *
   */
  [adapterTypes.adapter]: wasm => wrapWasmAdapter(wasm),
  /**
   * @param {WebAssembly.Exports} wasm
   */
  [adapterTypes.service]: wasm => wrapWasmService(wasm)
}

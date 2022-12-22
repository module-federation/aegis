const assert = require('assert')
const WasmInterop = require('../../src/adapters/webassembly/wasm-interop')
  .WasmInterop
const wrapper = require('../../src/adapters/webassembly/wasm-decorators')

require('..').then(async wasmInstance => {
  const { onUpdate, serviceMeshNotify, runFibonacci } = wasmInstance.exports

  console.log(Object.entries(wasmInstance.exports))

  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)
  const model = await spec.factory({})({
    key1: '1',
    key2: '2',
    fibonacci: '45'
  })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model)
  adapter.callWasmFunction(serviceMeshNotify, 'testing')
  console.log(adapter.callWasmFunction(runFibonacci, model))
})

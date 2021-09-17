const assert = require('assert')
const WasmInterop = require('../../src/adapters/webassembly/wasm-interop')
  .WasmInterop
const wrapper = require('../../src/adapters/webassembly/wasm-decorators')

require('..').then(async wasmInstance => {
  const { onUpdate, websocketNotify, runFibonacci } = wasmInstance.exports

  //console.log(Object.entries(wasmInstance.exports))

  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)
  const model = await spec.factory({ key1: 'key1' })({ a: 'b' })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model)
  adapter.callWasmFunction(websocketNotify, 'testing')
  console.log(adapter.callWasmFunction(runFibonacci, { fibonacci: 20, a: 'b' }))
})

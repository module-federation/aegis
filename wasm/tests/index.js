const assert = require('assert')
const WasmInterop = require('../../src/adapters/webassembly/wasm-interop')
  .WasmInterop
const wrapper = require('../../src/adapters/webassembly/wasm-decorators')

require('..').then(async wasmInstance => {
  const { onUpdate, websocketNotify, runFibonacci } = wasmInstance.exports

  //console.log(Object.entries(wasmInstance.exports))

  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)

  // console.log(spec)
  const model = await spec.factory({ a: 'b' })({ c: 'd' })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model, false)
  adapter.callWasmFunction(websocketNotify, 'testing', false)
  console.log(adapter.callWasmFunction(runFibonacci, { fibonacci: 20, a: 'b' }))
})

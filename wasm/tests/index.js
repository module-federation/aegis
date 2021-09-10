const assert = require('assert')
const WasmInterop = require('../../src/adapters/webassembly/wasm-interop')
  .WasmInterop
const wrapper = require('../../src/adapters/webassembly/wasm-decorators')

require('..').then(async wasmInstance => {
  const {
    __pin,
    __unpin,
    __getString,
    __newString,
    __newArray,
    __getArray,
    ArrayOfStrings_ID,
    ArrayOfTuples_ID,
    ModelSpec,
    getModelSpec,
    modelFactory,
    fibonacci,
    onUpdate,
    websocketNotify,
    portEx,
    fibonacciRemote,
    test2
    // Input,
    // Output,
    // getInput,
    // getOutput,
    // testClass
  } = wasmInstance.exports

  //console.log(Object.entries(wasmInstance.exports))

  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)

  // console.log(spec)
  const model = await spec.factory({ a: 'b' })({ c: 'd' })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model, false)
  adapter.callWasmFunction(websocketNotify, 'testing', false)
  //console.log(adapter.callWasmFunction2(test2, { key1: 'val1', key2: 'val2' }))
  console.log(
    adapter.callWasmFunction(fibonacciRemote, { fibonacci: 20, a: 'b' })
  )
})

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
    ModelSpec,
    getModelSpec,
    modelFactory,
    fibonacci,
    onUpdate,
    websocketNotify,
    portEx,
    fibonacciRemote,
    modelName
    // Input,
    // Output,
    // getInput,
    // getOutput,
    // testClass
  } = wasmInstance.exports

  console.log(Object.entries(wasmInstance.exports))
  console.log(__getString(modelName))
  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)

  console.log(spec)
  const model = await spec.factory({ a: 'b' })({ c: 'd' })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model, false)
  adapter.callWasmFunction(websocketNotify, 'testing', false)

  const fib = 20
  console.log(
    'fibonacci of',
    fib,
    'is',
    adapter.callWasmFunction(fibonacci, fib)
  )
  console.log(adapter.callWasmFunction(fibonacciRemote, { fibonacci: 30.0 }))
  console.log(__getString(modelName))
  const obj = {
    modelName: __getString(modelName)
  }
  console.log(obj)
})

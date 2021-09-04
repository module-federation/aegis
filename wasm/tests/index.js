const assert = require('assert')
const WasmInterop = require('../wasm-interop').WasmInterop
const wrapper = require('../wasm-wrappers')

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
    portEx
    // Input,
    // Output,
    // getInput,
    // getOutput,
    // testClass
  } = wasmInstance.exports

  //console.log(Object.entries(wasmInstance.exports))

  const adapter = WasmInterop(wasmInstance)

  const spec = wrapper.wrapWasmModelSpec(wasmInstance)

  console.log(spec)
  console.log(spec.test({}))
  const model = await spec.factory({ a: 'b' })({ c: 'd' })
  console.log(model)
  adapter.callWasmFunction(onUpdate, model, false)

  const fib = 20
  console.log(
    'fibonacci of',
    fib,
    'is',
    adapter.callWasmFunction(fibonacci, fib)
  )
})

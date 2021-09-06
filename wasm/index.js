'use strict'

const fs = require('fs')
const loader = require('@assemblyscript/loader')
const adapter = require('../src/adapters/webassembly/wasm-interop').WasmInterop
// const { default: ObserverFactory } = require('../src/domain/observer')
// const observer = ObserverFactory.getInstance()

async function importWebAssembly () {
  const startTime = Date.now()

  // Check if we support streaming instantiation
  if (WebAssembly.instantiateStreaming) console.log('we can stream-compile now')

  //const response = await fetchWasm(remoteEntry)
  const wasm = await loader.instantiate(
    fs.readFileSync(__dirname + '/build/optimized.wasm'),
    {
      aegis: {
        log: ptr => console.log(wasm.exports.__getString(ptr)),
        //ptr => handleAsync(console.log, ptr),

        invokePort: (portName, portConsumerEvent, portData) =>
          handleAsync(console.log, portName, portConsumerEvent, portData),

        invokeMethod: (methodName, methodData, moduleName) =>
          handleAsync(console.log, moduleName, methodName, methodData),

        websocketListen: (eventName, callbackName) => {
          console.debug('websocket listen invoked')

          // observer.on(wasm.exports.__getString(eventName), eventData => {
          //   const cmd = adapter.findWasmCommand(
          //     wasm.exports.__getString(callbackName)
          //   )
          //   if (typeof cmd === 'function') {
          //     adapter.callWasmFunction(cmd, eventData, false)
          //   } else {
          //     console.log('cmd is not a function')
          //   }
          // })
        },

        websocketNotify: (eventName, eventData) =>
          console.log(
            'websocketNotify eventName',
            wasm.exports.__getString(eventName)
          ),
        // observer.notify(
        //   wasm.exports.__getString(eventName),
        //   wasm.exports.__getString(eventData)
        // ),

        requestDeployment: (webswitchId, remoteEntry) =>
          handleAsync(console.log, webswitchId, remoteEntry)
      }
    }
  )
  console.info('wasm modules took %dms', Date.now() - startTime)

  return wasm
}

module.exports = importWebAssembly().then(instance => {
  instance.exports._start() // allow imports access to memory before starting
  return instance
})

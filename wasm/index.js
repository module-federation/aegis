'use strict'

const fs = require('fs')
const loader = require('@assemblyscript/loader')
// const { default: ObserverFactory } = require('../src/domain/observer')
// const observer = ObserverFactory.getInstance()

async function importWebAssembly () {
  const startTime = Date.now()

  // Check if we support streaming instantiation
  if (WebAssembly.instantiateStreaming) console.log('we can stream-compile now')

  //const response = await fetchWasm(remoteEntry)
  const wasm = await loader.instantiate(
    fs.readFileSync(__dirname + '/break-to-return.wasm'), //'/build/optimized.wasm'),
    {
      aegis: {
        log: ptr => console.log(wasm.exports.__getString(ptr)),

        /**
         * invoke a port on the model instance
         * @param {string} portName - name of the port
         * @param {string} portConsumerEvent - value of `port.consumesEvent`
         * @param {string} portData - data to send through the port
         */
        invokePort (portName, portConsumerEvent, portData, cb, undo) {
          console.log(
            'js invokePort called by wasm',
            wasm.exports.__getString(portName),
            wasm.exports.__getString(portConsumerEvent),
            wasm.exports.__getString(portData),
            wasm.exports.__getString(cb),
            wasm.exports.__getString(undo)
          )
        },

        /**
         * invoke a method on the model instance
         * @param {string} methodName
         * @param {string} methodData
         * @param {string} moduleName
         */
        invokeMethod (methodName, methodData, moduleName) {
          console.log(
            'js invokeMethod called by wasm',
            wasm.exports.__getString(methodName),
            wasm.exports.__getString(methodData),
            wasm.exports.__getString(moduleName)
          )
        },

        /**
         * listen for event `eventName` and call a wasm exported
         * function by the name of `callbackName`.
         *
         * @param {string} eventName - name of event
         * @param {string} callbackName - name of exported function to run when event fires
         */
        addListener (eventName, callbackName, options) {
          const { allowMultiple = true, once = true } = options
          console.debug('websocket listen invoked')
          const adapter = WasmInterop(wasm)
          const fn = adapter.findWasmFunction(
            wasm.exports.__getString(callbackName)
          )

          if (typeof fn === 'function') {
            observer.on(eventName, eventData => {
              adapter.callWasmFunction(fn, eventData, { allowMultiple, once })
              return
            })
            console.log('no command found')
          }
        },

        /**
         *
         * @param {string} eventName
         * @param {string} eventData
         */
        fireEvent (eventName, eventData) {
          const adapter = WasmInterop(wasm)
          const name = adapter.__getString(eventName)
          const data = adapter.constructObject(eventData)
          console.log('wasm called js to emit an event + ', name, ': ', data)
          observer.notify(name, data, true)
        },

        /**
         *
         * @param {string} remoteEntry - name of remote entry
         */
        requestDeployment: remoteEntry =>
          console.log('deploy', wasm.exports.__getString(remoteEntry))
      }
    }
  )
  console.info('wasm modules took %dms', Date.now() - startTime)

  // if (type === 'model') return wrapWasmModelSpec(wasm)
  // if (type === 'adapter') return wrapWasmAdapter(wasm)
  // if (type === 'service') return wrapWasmService(wasm)

  return wasm
}

module.exports = importWebAssembly().then(instance => {
  //instance.exports._start() // allow imports access to memory before starting
  return instance
})

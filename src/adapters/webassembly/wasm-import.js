'use strict'

import { performance as perf } from 'perf_hooks'
import { EventBrokerFactory } from '../../domain'
import { WasmInterop } from './wasm-interop'
import { wasmAdapters } from '.'
import { loadWasmModule } from './wasm-loader'

const broker = EventBrokerFactory.getInstance()

function __liftString (pointer) {
  if (!pointer) return null
  const end =
      (pointer + new Uint32Array(memory.buffer)[(pointer - 4) >>> 2]) >>> 1,
    memoryU16 = new Uint16Array(memory.buffer)
  let start = pointer >>> 1,
    string = ''
  while (end - start > 1024)
    string += String.fromCharCode(...memoryU16.subarray(start, (start += 1024)))
  return string + String.fromCharCode(...memoryU16.subarray(start, end))
}

/**
 * Import and run a WebAssembly module as an Aegis model, adapter, or service
 * @param {import('../../../webpack/remote-entries-type').remoteEntry} remoteEntry
 * @param {"model"|"service"|"adapter"} type
 * @returns
 */
export async function importWebAssembly (remoteEntry) {
  const startTime = perf.now()

  // Check if we support streaming instantiation y
  if (WebAssembly.instantiateStreaming) console.log('we can stream-compile now')

  // compile and instantiate the wasm module, importing js funcs below
  const wasm = await loadWasmModule(remoteEntry, {
    env: {
      abort (message, fileName, lineNumber, columnNumber) {
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        message = __liftString(message >>> 0)
        fileName = __liftString(fileName >>> 0)
        lineNumber = lineNumber >>> 0
        columnNumber = columnNumber >>> 0
        ;(() => {
          // @external.js
          throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`)
        })()
      },
      'Date.now':
        // ~lib/bindings/dom/Date.now() => f64
        Date.now
    },
    aegis: {
      log: ptr => console.log(wasm.exports.__getString(ptr)),

      /**
       * listen for event `eventName` and call a wasm exported
       * function by the name of `callbackName`.
       *
       * @param {string} eventName - name of event
       * @param {string} callbackName - name of exported function to run when event fires
       */
      addListener (eventName, callbackName) {
        const interop = WasmInterop(wasm)
        const event = wasm.exports.__getString(eventName)
        const callback = wasm.exports.__getString(callbackName)
        console.debug('addListener', callback, 'eventName', event)

        const fn = interop.findWasmFunction(callback)

        if (typeof fn !== 'function') {
          console.warn('callback is not a function', callback)
          return
        }

        broker.on(event, eventData => interop.callWasmFunction(fn, eventData), {
          once: true
        })
      },

      /**
       * Emit an event. Event listeners are invoked.
       * @param {string} eventName
       * @param {string} eventData
       */
      async fireEvent (eventName, eventData) {
        const interop = WasmInterop(wasm)
        const event = wasm.exports.__getString(eventName)
        const data = interop.constructObject(eventData)
        console.debug('fireEvent', data)
        broker.notify(event, data)
      },

      /**
       *
       * @param {string} remoteEntry - name of remote entry
       */
      requestDeployment: remoteEntry =>
        console.log('deploy', wasm.exports.__getString(remoteEntry))
    }
  })

  console.info('wasm modules took %dms', perf.now() - startTime)

  // delay immediate start to allow imports access to memory
  // compile with --explicitStart
  console.log({ wasm })
  // wasm.instance.exports._start()

  return wasmAdapters[remoteEntry.type](wasm)
}

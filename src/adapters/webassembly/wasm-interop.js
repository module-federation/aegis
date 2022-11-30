'use strict'

const { DefaultDeserializer } = require('v8')

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * WASM interop functions
 * - find exported functions
 * - call exported functions
 * - import command configuration
 * - import port configuration
 * - decode memory addresses
 * @param {WebAssembly.Instance} instance
 * @returns adapter functions
 */
exports.WasmInterop = function (wasmExports) {
  const {
    getCommands,
    getPorts,
    __callWasmFunction,
    ArrayOfStrings_ID,
    __pin,
    __unpin,
    liftString,
    liftArray
  } = wasmExports

  /**
   * Construct an object from the key-value pairs in the multidimensional array
   * @param {number} ptr - pointer to the address of the array of string arrays
   * @returns {Readonly<{object}>}
   */
  function constructObject (ptr, unpin = true) {
    if (!ptr) {
      console.debug(constructObject.name, 'null pointer', ptr)
      return
    }

    try {
      const obj = liftArray(ptr)
        .map(inner => liftArray(inner))
        .map(tuple => ({ [liftString(tuple[0])]: liftString(tuple[1]) }))
        .reduce((obj1, obj2) => ({ ...obj1, ...obj2 }))

      const immutableClone = Object.freeze({ ...obj })
      !unpin || __unpin(ptr)
      console.debug(constructObject.name, ptr)
      return immutableClone
    } catch (e) {
      console.error(constructObject.name, 'error:', e.message)
      return {}
    }
  }

  return Object.freeze({
    importWasmCommands () {
      const commandNames = getCommands()
      return Object.keys(commandNames)
        .map(command => {
          return {
            [command]: {
              command: model =>
                __callWasmFunction(command, {
                  ...model,
                  modelId: model.getId(),
                  modelName: model.getName()
                }),
              acl: ['read', 'write']
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }), {})
    },

    /**
     * For every command in {@link getCommands} create a
     * `command` entry that will invoke the specified
     *  exported function
     */
    importWasmPorts () {
      const ports = getPorts()
      return Object.keys(ports)
        .map(port => {
          const [
            service,
            type,
            consumesEvent,
            producesEvent,
            callback,
            undo,
            forward
          ] = ports[port].split(',')
          return {
            /**@type {import("../../domain").ports[x]} */
            [port]: {
              service,
              type,
              consumesEvent,
              producesEvent,
              callback: data => __callWasmFunction(callback, data),
              undo: data => __callWasmFunction(undo, data),
              forward
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },
    constructObject (ptr) {
      return constructObject(ptr, false)
    }
  })
}

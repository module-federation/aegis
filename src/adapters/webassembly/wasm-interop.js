'use strict'

/** @typedef {import("../../domain").ModelSpecification} ModelSpecification */
/** @typedef {import("../../domain").Model} Model */
/** @typedef {{[x:string]:()=>void}} Service */
/** @typedef {function(Service):function(*):Promise} Adapter */

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
    liftString,
    liftArray,
    lowerString,
    lowerArray,
    store_ref,
    notnull,
    memory,
    callExportedFn
  } = wasmExports

  function lift (fn, kv) {
    return liftArray(
      pointer =>
        liftArray(
          pointer => liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
          2,
          new Uint32Array(memory.buffer)[pointer >>> 2]
        ),
      2,
      callExportedFn(fn, kv) >>> 0
    )
      .map(([k, v]) => ({ [k]: v }))
      .reduce((a, b) => ({ ...a, ...b }))
  }

  function lower (entries) {
    return (
      lowerArray(
        (pointer, value) => {
          store_ref(
            pointer,
            lowerArray(
              (pointer, value) => {
                store_ref(pointer, lowerString(value.toString()) || notnull())
              },
              4,
              2,
              value
            ) || notnull()
          )
        },
        5,
        2,
        entries
      ) || notnull()
    )
  }

  /**
   * Parse the input object into a multidimensional array of key-value pairs
   * and pass it as an argument to the exported wasm function. Do the reverse for
   * the response. Consequently, any wasm port or command function must accept a
   * multidemensional array of strings (numbers are converted to strings) and return
   * a multidimensional array of strings.
   *
   * Before they can be called, they must be registered in the wasm modelspec,
   * that is getPorts() and getCommands() must return appropria metadata.
   *
   * Notes:
   *
   * - for the moment, we only support strings and numbers in the input
   * and output objects.
   *
   * - {@link args} can also be a number, in which case, so is the return value.
   *
   * @param {string} fn exported wasm function name
   * @param {object|number} [obj] object or number, see above
   * @returns {object|number} object or number, see above
   */
  function callWasmFunction (fn, obj) {
    const entries = Object.entries(obj)
    const kv = lower(entries)
    return lift(fn, kv)
  }

  return Object.freeze({
    importWasmCommands () {
      const commandNames = getCommands()
      return Object.keys(commandNames)
        .map(command => {
          return {
            [command]: {
              command: model =>
                callWasmFunction(command, {
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
              callback: data => callWasmFunction(callback, data),
              undo: data => callWasmFunction(undo, data),
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

/**
 * Construct an object from the key-value pairs in the multidimensional array
 * @param {number} ptr - pointer to the address of the array of string arrays
 * @returns {Readonly<{object}>}
 */
// function constructObject (ptr, unpin = true) {
//   if (!ptr) {
//     console.debug(constructObject.name, 'null pointer', ptr)
//     return
//   }

//   try {
//     const obj = liftArray(ptr)
//       .map(inner => liftArray(inner))
//       .map(tuple => ({ [liftString(tuple[0])]: liftString(tuple[1]) }))
//       .reduce((obj1, obj2) => ({ ...obj1, ...obj2 }))

//     const immutableClone = Object.freeze({ ...obj })
//     !unpin || __unpin(ptr)
//     console.debug(constructObject.name, ptr)
//     return immutableClone
//   } catch (e) {
//     console.error(constructObject.name, 'error:', e.message)
//     return {}
//   }
// }

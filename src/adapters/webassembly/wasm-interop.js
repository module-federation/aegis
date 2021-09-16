'use strict'

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * WASM adapter functions
 * - find exported functions
 * - call exported functions
 * - export Aegis command configuration
 * - export Aegis port configuration
 * @param {WebAssembly.Instance} module
 * @returns adapter functions
 */
exports.WasmInterop = function (module) {
  const {
    getCommands,
    getPorts,
    ArrayOfStrings_ID,
    __pin,
    __unpin,
    __getString,
    __newString,
    __newArray,
    __getArray
  } = module.exports

  /**
   * only strings and numbers in the object are supported for the moment.
   *
   * @param {object} args input object
   * @returns {{keys:string[],vals:string[]}} pointer arrays
   */
  function parseArguments (args) {
    const filtered = Object.entries(args).filter(([, v]) =>
      ['string', 'number'].includes(typeof v)
    )
    const keyPtrs = filtered.map(([k]) => __pin(__newString(k)))
    const valPtrs = filtered.map(([, v]) => __pin(__newString(v.toString())))

    return {
      keys: keyPtrs,
      vals: valPtrs
    }
  }

  /**
   *
   * @param {{
   *  fn:function(number[],number[]),
   *  keys?:string[],
   *  vals?:string[],
   *  num?:number
   * }} param0
   * @returns {string[][]|number|void}
   */
  function callExportedFunction ({
    fn: wasmFn,
    keys: keyPtrs = [],
    vals: valPtrs = [],
    num = null
  }) {
    if (typeof num === 'number') {
      return wasmFn(num)
    }

    if (keyPtrs.length > 0) {
      const keyArrayPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs))
      const valArrayPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs))

      // The arrays keep values alive from now on
      keyPtrs.forEach(__unpin)
      valPtrs.forEach(__unpin)

      // Provide input as two arrays of strings, one for keys, other for values
      return __pin(wasmFn(keyArrayPtr, valArrayPtr))
    }
    return __pin(wasmFn())
  }

  /**
   * Construct an object from the key-value pairs in the multidimensional array
   * @param {number} ptr - pointer to the address of the array of string arrays
   * @returns {Readonly<{object}>}
   */
  function constructObject (ptr) {
    if (!ptr) return

    const obj = __getArray(ptr)
      .map(inner => __getArray(inner))
      .map(tuple => ({ [__getString(tuple[0])]: __getString(tuple[1]) }))
      .reduce((prop1, prop2) => ({ ...prop1, ...prop2 }))

    const immutableClone = Object.freeze({ ...obj })
    __unpin(ptr)
    return immutableClone
  }

  return {
    /**
     * For any function that accepts and returns an object,
     * we parse the input object into two string arrays, one for keys,
     * the other for values, and pass them to the exported function as
     * arguments. The exported function returns a multidemnsional array
     * of key-value pairs, which we convert to an object and return.
     *
     * Handling objects in this way, versus declaring a custom class
     * for each exported function, is more efficient.
     *
     * Notes:
     *
     * - for the moment, we only support strings and numbers in the input
     * and output objects. Otherwise, a custom parser is required.
     *
     * - `args` can also be a number, in which case, so is the return value.
     *
     *
     * @param {function()} fn exported wasm function
     * @param {object|number} [args] object or number, see above
     * @returns {object|number} object or number, see above
     */
    callWasmFunction (fn, args = {}) {
      if (!fn) {
        console.warn(this.callWasmFunction.name, 'no function provided')
        return
      }
      if (typeof args === 'number')
        return callExportedFunction({ fn, num: args })
      // Parse the object into a couple string arrays, one for keys, the other values
      const { keys, vals } = parseArguments(args)
      // Call the exported function with the key-value arrays
      const obj = callExportedFunction({ fn, keys, vals })
      // Construct an object from the key-value pairs
      return constructObject(obj)
    },

    /**
     * Commands can be invoked from the REST API. Return
     * a list of commands to invoke in this way. The name
     * must match the name of an exported function.
     * @param {*} name
     * @returns {function()} exported function
     */
    findWasmFunction (name) {
      const commandName = Object.keys(module.exports).find(
        k => typeof module.exports[k] === 'function' && k === name
      )
      if (commandName) return module.exports[commandName]
    },

    /**
     * For every command in {@link getCommands} create a
     * `commands` entry pointing to the exported function
     */
    exportWasmCommands () {
      const commandNames = this.callWasmFunction(getCommands)
      return Object.keys(commandNames)
        .map(command => {
          const cmdFn = this.findWasmFunction(command)
          if (cmdFn) {
            return {
              [command]: {
                command: input => this.callWasmFunction(cmdFn, input),
                acl: ['read']
              }
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

    /**
     * Generate port entries. Calls {@link getPorts}.
     */
    exportWasmPorts () {
      const ports = this.callWasmFunction(getPorts)
      return Object.keys(ports)
        .map(port => {
          const [service, type, callback, undo] = ports[port].split(',')
          const cb = this.findWasmFunction(callback)
          const undoCb = this.findWasmFunction(undo)
          return {
            /**@type {import("../../domain").ports[x]} */
            [port]: {
              service,
              type,
              callback: data => this.callWasmFunction(cb, data),
              undo: data => this.callWasmFunction(undoCb, data)
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    }
  }
}

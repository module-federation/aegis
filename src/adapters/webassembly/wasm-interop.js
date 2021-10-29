'use strict'

/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

/**
 * WASM adapter functions
 * - find exported functions
 * - call exported functions
 * - import command configuration
 * - import port configuration
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
   * Call the exported function {@link wasmFn} with
   * two string arrays, one for keys {@link keyPtrs},
   * the other for values {@link valPtrs} of a
   * deconstructed object, or a number {@link num}
   * or neither.
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
      return __pin(wasmFn(num))
    }

    if (keyPtrs.length > 0) {
      const keyArrayPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs))
      const valArrayPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs))

      // The arrays keep values alive from now on
      keyPtrs.forEach(__unpin)
      valPtrs.forEach(__unpin)

      // Provide input as two arrays of strings, one for keys, other for values
      const ptr = __pin(wasmFn(keyArrayPtr, valArrayPtr))

      // release arrays
      __unpin(keyArrayPtr)
      __unpin(valArrayPtr)

      return ptr
    }
    return __pin(wasmFn())
  }

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
      const obj = __getArray(ptr)
        .map(inner => __getArray(inner))
        .map(tuple => ({ [__getString(tuple[0])]: __getString(tuple[1]) }))
        .reduce((prop1, prop2) => ({ ...prop1, ...prop2 }))

      const immutableClone = Object.freeze({ ...obj })
      !unpin || __unpin(ptr)
      console.debug(constructObject.name, ptr)
      return immutableClone
    } catch (e) {
      console.error(constructObject.name, 'error:', e.message)
      return {}
    }
  }

  /**
   * Resolve and check argument types, where `resolve` means
   * invoke {@link args} if it is a function, then check the return value.
   * @param {function()} fn - the exported function to call
   * @param {object|number|function} args - object or number
   * ...or a function that returns an object or number
   * @returns
   */
  function resolveArguments (fn, args) {
    if (typeof fn !== 'function') {
      console.warn(this.callWasmFunction.name, 'invalid function', fn)
      return null
    }

    const resolved = typeof args === 'function' ? args() : args
    if (resolved) {
      if (typeof resolved === 'string') {
        return { key: resolved }
      }
      if (!['number', 'object'].includes(typeof resolved)) {
        console.warn(resolveArguments.name, 'invalid argument', args)
        return null
      }
      return resolved
    }

    return {}
  }

  return Object.freeze({
    /**
     * For any function that accepts and returns an object,
     * we parse the input object into two string arrays, one for keys,
     * the other for values, and pass them to the exported function as
     * arguments. The exported function returns a multidimensional array
     * of key-value pairs, which we convert to an object and return.
     *
     * We can handle objects this way or declare a custom class for each
     * function - or use the same class if it contains two string arrays :)
     *
     * Notes:
     *
     * - for the moment, we only support strings and numbers in the input
     * and output objects. Otherwise, a custom parser is required.
     *
     * - {@link args} can also be a number, in which case, so is the return value.
     *
     * @param {function()} fn exported wasm function
     * @param {object|number} [args] object or number, see above
     * @returns {object|number} object or number, see above
     */
    callWasmFunction (fn, args = {}) {
      const resolvedArgs = resolveArguments(fn, args)
      if (!resolvedArgs) return
      // handle numeric arg
      if (typeof resolvedArgs === 'number')
        return callExportedFunction({ fn, num: resolvedArgs })
      // Parse the object into a couple string arrays, one for keys, the other values
      const { keys, vals } = parseArguments(resolvedArgs)
      // Call the exported function with the key and val arrays
      const ptr = callExportedFunction({ fn, keys, vals })
      // Construct an object from the key-value pairs array pointer
      return constructObject(ptr)
    },

    /**
     * Find a function called `name` in the {@link module.exports}
     * and return it.
     *
     * @param {string} name
     * @returns {function()} exported function
     */
    findWasmFunction (name) {
      const fn = Object.keys(module.exports).find(
        k => typeof module.exports[k] === 'function' && k === name
      )
      if (fn) return module.exports[fn]
    },

    /**
     * For every command in {@link getCommands} create a
     * `commands` entry that will invoke the specified
     *  exported function when executed
     */
    importWasmCommands () {
      const commandNames = this.callWasmFunction(getCommands)
      return Object.keys(commandNames)
        .map(command => {
          const cmdFn = this.findWasmFunction(command)
          if (cmdFn) {
            return {
              [command]: {
                command: model =>
                  this.callWasmFunction(cmdFn, {
                    ...model,
                    modelId: model.getId(),
                    modelName: model.getName()
                  }),
                acl: ['read', 'write']
              }
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

    /**
     * Generate port entries. Calls {@link getPorts}.
     */
    importWasmPorts () {
      const ports = this.callWasmFunction(getPorts)
      return Object.keys(ports)
        .map(port => {
          const [
            service,
            type,
            consumesEvent,
            producesEvent,
            callback,
            undo
          ] = ports[port].split(',')
          const cb = this.findWasmFunction(callback)
          const undoCb = this.findWasmFunction(undo)
          return {
            /**@type {import("../../domain").ports[x]} */
            [port]: {
              service,
              type,
              consumesEvent,
              producesEvent,
              callback: data => this.callWasmFunction(cb, data),
              undo: data => this.callWasmFunction(undoCb, data)
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

    constructObject: ptr => constructObject(ptr, false)
  })
}

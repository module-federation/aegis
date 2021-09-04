'use strict'
/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

export default function WasmInterop (module) {
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
    const filtered = Object.entries(args).filter(([k, v]) =>
      ['string', 'number'].includes(typeof v)
    )
    const keyPtrs = filtered.map(([k, v]) => __pin(__newString(k)))
    const valPtrs = filtered.map(([k, v]) => __pin(__newString(v)))

    return {
      keys: keyPtrs,
      vals: valPtrs
    }
  }

  /**
   *
   * @param {{
   *  fn:function(number[],number[]),
   *  keys:string[],
   *  vals:string[],
   *  retval:boolean
   * }} param0
   * @returns {string[][]|void}
   */
  function callExport ({
    fn: wasmFn,
    keys: keyPtrs = [],
    vals: valPtrs = [],
    num = null,
    retval = true
  }) {
    if (typeof num === 'number') {
      return wasmFn(num)
    }

    if (keyPtrs.length > 0) {
      const keyArrayPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs))
      const valArrayPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs))

      // The arrays keeps values alive from now on
      keyPtrs.forEach(__unpin)
      valPtrs.forEach(__unpin)

      // Provide input as two arrays of strings, one for keys, other for values
      if (retval) return __pin(wasmFn(keyArrayPtr, valArrayPtr))
    } else {
      if (retval) return __pin(wasmFn())
    }
    // no return or input
    return wasmFn()
  }

  /**
   * Construct an object from the key value pairs
   * @param {*} ptr
   * @returns
   */
  function returnObject (ptr) {
    const obj = __getArray(ptr)
      .map(inner => __getArray(inner))
      .map(tuple => ({ [__getString(tuple[0])]: __getString(tuple[1]) }))
      .reduce((prop1, prop2) => ({ ...prop1, ...prop2 }))

    const immutableClone = Object.freeze({ ...obj })
    __unpin(ptr)
    return immutableClone
  }

  function cleanup (obj) {
    if (obj) __unpin(obj)
  }

  return {
    /**
     * For any function that accepts and returns an object,
     * we parse the input object into 2 string arrays, one for keys,
     * the other for values and return a multidemnsional array of
     * key-value pairs. This way we avoid having to declare classes.
     *
     * @param {function()} fn exported wasm function
     * @param {object} [args] data from request, see above
     * @param {boolean} [retval] is there a return object, true by default
     * @returns {object} see above
     */
    callWasmFunction (fn, args = {}, retval = true) {
      if (typeof args === 'number') return callExport({ fn, num: args })
      const { keys, vals } = parseArguments(args)
      const obj = callExport({ fn, keys, vals })
      if (retval) return returnObject(obj)
      cleanup(obj)
    },

    /**
     * Commands can be invoked from the REST API. Return
     * a list of commands to invoke in this way. The name
     * must match the name of an exported function.
     * @param {*} name
     * @returns {function()}
     */
    findWasmCommand (name) {
      const commandName = Object.keys(module.exports).find(
        k => typeof module.exports[k] === 'function' && k === name
      )
      if (commandName) return module.exports[commandName]
    },

    /**
     * Generate new method that implements the command
     * @returns
     */
    configureWasmCommands () {
      const commandNames = this.callWasmFunction(getCommands)
      return Object.keys(commandNames)
        .map(command => {
          const cmdFn = this.findWasmCommand(command)
          if (cmdFn) {
            return {
              [command]: {
                command: input => this.callWasmFunction(cmdFn, input),
                acl: ['write']
              }
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

    /**
     * Generate port method
     * @returns
     */
    configureWasmPorts () {
      const ports = this.callWasmFunction(getPorts)
      return Object.keys(ports)
        .map(port => {
          if (ports[port]) {
            const [service, adapter, callback, type] = ports[port].split(',')
            return {
              /**@type {import("../../domain").ports[x]} */
              [port]: {
                service,
                adapter,
                callback,
                type
              }
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    }
  }
}

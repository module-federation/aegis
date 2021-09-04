/**@typedef {import("../../domain").ModelSpecification} ModelSpecification */
/**@typedef {import("../../domain").Model} Model */
/**@typedef {{[x:string]:()=>void}} Service */
/**@typedef {function(Service):function(*):Promise} Adapter*/

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
   * Object only supports strings and numbers for the moment.
   *
   * @param {object} args input object
   * @returns {{keys:number[],vals:number[]}} pointer arrays
   */
  function parseArguments (args) {
    const keyPtrs = Object.keys(args).map(k => __pin(__newString(k)))
    const valPtrs = Object.values(args).map(v => __pin(__newString(v)))

    return {
      keys: keyPtrs,
      vals: valPtrs
    }
  }

  function callExport ({
    fn: wasmFn,
    keys: keyPtrs = [],
    vals: valPtrs = [],
    retval = true,
    num = null
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
    return wasmFunc()
  }

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
     * we instead pass and return two string arrays, one array
     * for the object's keys, the other for it's values.
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

    getWasmCommands () {
      const commandNames = this.callWasmFunction(getCommands)
      const findCommand = command =>
        Object.keys(module.exports).find(
          k => typeof module.exports[k] === 'function' && k === command
        )

      return Object.keys(commandNames)
        .map(command => {
          const cmd = findCommand(command)
          if (cmd) {
            return {
              [command]: {
                command: input => this.callWasmFunction(cmd, input),
                acl: ['write']
              },
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

    getWasmPorts () {
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
    },
  }
}

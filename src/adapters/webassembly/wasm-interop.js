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
   * Object only supports strings and numbers for the moment.
   *
   * @param {object} args input object
   * @returns {{keys:number[],vals:number[]}} pointer arrays
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

  function callExport ({ fn, keys: keyPtrs, vals: valPtrs, retval = true }) {
    if (keyPtrs.length > 0) {
      const keyArrayPtr = __pin(__newArray(ArrayOfStrings_ID, keyPtrs))
      const valArrayPtr = __pin(__newArray(ArrayOfStrings_ID, valPtrs))

      // The arrays keeps values alive from now on
      keyPtrs.forEach(__unpin)
      valPtrs.forEach(__unpin)

      // Provide input as two arrays of strings, one for keys, other for values
      if (retval) return __pin(fn(keyArrayPtr, valArrayPtr))
    } else {
      if (retval) return __pin(fn())
    }
    // no return or input
    return fn()
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

  return {
    cleanup (obj) {
      if (obj) __unpin(obj)
    },

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
      const { keys, vals } = parseArguments(args)
      const obj = callExport({ fn, keys, vals })
      if (retval) return returnObject(obj)
      cleanup(obj)
    },
    log (wasm, ptr) {
      if (wasm.then) {
        wasm.then(inst => console.log(inst.exports.__getString(ptr)))
      }
      if (wasm.exports) {
        console.log(wasm.exports.__getString(ptr))
      }
    },
    findWasmCommand (name) {
      const commandName = Object.keys(module.exports).find(
        k => typeof module.exports[k] === 'function' && k === name
      )
      if (commandName) return module.exports[commandName]
    },

    configureWasmCommands () {
      const commandNames = this.callWasmFunction(getCommands)
      return Object.keys(commandNames)
        .map(command => {
          const cmdFn = this.findWasmCommand(command)
          if (cmdFn) {
            return {
              [command]: {
                command: input => this.callWasmFunction(cmdFn, input),
                acl: ['write'],
                description: commandNames[command] || 'wasm command'
              }
            }
          }
        })
        .reduce((p, c) => ({ ...p, ...c }))
    },

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
    },

    /**
     * in case we need to call something later on that alloc's mem
     */
    dispose () {
      //
    }
  }
}

'use strict'

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
exports.WasmInterop = function (instance) {
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
  } = instance.exports

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
      console.warn(this.callWasmFunction.name, 'not a function', fn)
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

  return (
    Object.freeze({
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
       * Find a function called `name` in the {@link instance.exports}
       * and return it.
       *
       * @param {string} name
       * @returns {function()} exported function
       */
      findWasmFunction (name) {
        const fn = Object.keys(instance.exports).find(
          k => typeof instance.exports[k] === 'function' && k === name
        )
        if (fn) return instance.exports[fn]
      },

      /**
       * For every command in {@link getCommands} create a
       * `command` entry that will invoke the specified
       *  exported function
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
          .reduce((p, c) => ({ ...p, ...c }), {})
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
              undo,
              forward
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
                undo: data => this.callWasmFunction(undoCb, data),
                forward
              }
            }
          })
          .reduce((p, c) => ({ ...p, ...c }), {})
      },

      constructObject: ptr => constructObject(ptr, false)
    }),

    
    function getCommands () {
      // assembly/index/getCommands() => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
      return __liftArray(
        pointer =>
          __liftArray(
            pointer =>
              __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
            2,
            new Uint32Array(memory.buffer)[pointer >>> 2]
          ),
        2,
        exports.getCommands() >>> 0
      )
    }
  )

  function __liftString (pointer) {
    if (!pointer) return null
    const end =
        (pointer + new Uint32Array(memory.buffer)[(pointer - 4) >>> 2]) >>> 1,
      memoryU16 = new Uint16Array(memory.buffer)
    let start = pointer >>> 1,
      string = ''
    while (end - start > 1024)
      string += String.fromCharCode(
        ...memoryU16.subarray(start, (start += 1024))
      )
    return string + String.fromCharCode(...memoryU16.subarray(start, end))
  }
  function __lowerString (value) {
    if (value == null) return 0
    const length = value.length,
      pointer = exports.__new(length << 1, 2) >>> 0,
      memoryU16 = new Uint16Array(memory.buffer)
    for (let i = 0; i < length; ++i)
      memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i)
    return pointer
  }
  function __liftArray (liftElement, align, pointer) {
    if (!pointer) return null
    const memoryU32 = new Uint32Array(memory.buffer),
      dataStart = memoryU32[(pointer + 4) >>> 2],
      length = memoryU32[(pointer + 12) >>> 2],
      values = new Array(length)
    for (let i = 0; i < length; ++i)
      values[i] = liftElement(dataStart + ((i << align) >>> 0))
    return values
  }
  function __lowerArray (lowerElement, id, align, values) {
    if (values == null) return 0
    const length = values.length,
      buffer = exports.__pin(exports.__new(length << align, 1)) >>> 0,
      header = exports.__pin(exports.__new(16, id)) >>> 0,
      memoryU32 = new Uint32Array(memory.buffer)
    memoryU32[(header + 0) >>> 2] = buffer
    memoryU32[(header + 4) >>> 2] = buffer
    memoryU32[(header + 8) >>> 2] = length << align
    memoryU32[(header + 12) >>> 2] = length
    for (let i = 0; i < length; ++i)
      lowerElement(buffer + ((i << align) >>> 0), values[i])
    exports.__unpin(buffer)
    exports.__unpin(header)
    return header
  }
  const refcounts = new Map()
  function __retain (pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer)
      if (refcount) refcounts.set(pointer, refcount + 1)
      else refcounts.set(exports.__pin(pointer), 1)
    }
    return pointer
  }
  function __release (pointer) {
    if (pointer) {
      const refcount = refcounts.get(pointer)
      if (refcount === 1) exports.__unpin(pointer), refcounts.delete(pointer)
      else if (refcount) refcounts.set(pointer, refcount - 1)
      else
        throw Error(`invalid refcount '${refcount}' for reference '${pointer}'`)
    }
  }
  function __notnull () {
    throw TypeError('value must not be null')
  }
  function __store_ref (pointer, value) {
    new Uint32Array(memory.buffer)[pointer >>> 2] = value
  }
}

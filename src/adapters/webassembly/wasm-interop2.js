import * as __import0 from 'aegis'
async function instantiate (module, imports = {}) {
  const __module0 = imports.aegis
  const adaptedImports = {
    env: Object.assign(Object.create(globalThis), imports.env || {}, {
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
    }),
    aegis: Object.assign(Object.create(__module0), {
      log (s) {
        // assembly/aegis/log(~lib/string/String) => void
        s = __liftString(s >>> 0)
        __module0.log(s)
      },
      addListener (eventName, callbackName) {
        // assembly/aegis/addListener(~lib/string/String, ~lib/string/String) => void
        eventName = __liftString(eventName >>> 0)
        callbackName = __liftString(callbackName >>> 0)
        __module0.addListener(eventName, callbackName)
      },
      fireEvent (eventName, eventData, forward) {
        // assembly/aegis/fireEvent(~lib/string/String, ~lib/array/Array<~lib/array/Array<~lib/string/String>>, f64) => void
        eventName = __liftString(eventName >>> 0)
        eventData = __liftArray(
          pointer =>
            __liftArray(
              pointer =>
                __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
              2,
              new Uint32Array(memory.buffer)[pointer >>> 2]
            ),
          2,
          eventData >>> 0
        )
        __module0.fireEvent(eventName, eventData, forward)
      }
    })
  }
  const { exports } = await WebAssembly.instantiate(module, adaptedImports)
  const memory = exports.memory || imports.env.memory
  const adaptedExports = Object.setPrototypeOf(
    {
      ArrayOfStrings_ID: {
        // assembly/index/ArrayOfStrings_ID: u32
        valueOf () {
          return this.value
        },
        get value () {
          return exports.ArrayOfStrings_ID.value >>> 0
        }
      },

      getModelName () {
        // assembly/index/getModelName() => ~lib/string/String
        return __liftString(exports.getModelName() >>> 0)
      },

      getEndpoint () {
        // assembly/index/getEndpoint() => ~lib/string/String
        return __liftString(exports.getEndpoint() >>> 0)
      },

      modelFactory (keys, values) {
        // assembly/index/modelFactory(~lib/array/Array<~lib/string/String>, ~lib/array/Array<~lib/string/String>) => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
        keys = __retain(
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            keys
          ) || __notnull()
        )
        values =
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            values
          ) || __notnull()
        try {
          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.modelFactory(keys, values) >>> 0
          )
        } finally {
          __release(keys)
        }
      },

      getPorts (keys, vals) {
        // assembly/index/getPorts(~lib/array/Array<~lib/string/String>, ~lib/array/Array<~lib/string/String>) => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
        keys = __retain(
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            keys
          ) || __notnull()
        )
        vals =
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            vals
          ) || __notnull()
        try {
          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.getPorts(keys, vals) >>> 0
          )
        } finally {
          __release(keys)
        }
      },

      getCommands () {
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
      },

      onUpdate (keys, vals) {
        // assembly/index/onUpdate(~lib/array/Array<~lib/string/String>, ~lib/array/Array<~lib/string/String>) => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
        keys = __retain(
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            keys
          ) || __notnull()
        )
        vals =
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            vals
          ) || __notnull()
        try {
          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.onUpdate(keys, vals) >>> 0
          )
        } finally {
          __release(keys)
        }
      },

      onDelete (keys, vals) {
        // assembly/index/onDelete(~lib/array/Array<~lib/string/String>, ~lib/array/Array<~lib/string/String>) => void
        keys = __retain(
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            keys
          ) || __notnull()
        )
        vals =
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            vals
          ) || __notnull()
        try {
          exports.onDelete(keys, vals)
        } finally {
          __release(keys)
        }
      },

      validate (keys, vals) {
        // assembly/index/validate(~lib/array/Array<~lib/string/String>, ~lib/array/Array<~lib/string/String>) => void
        keys = __retain(
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            keys
          ) || __notnull()
        )
        vals =
          __lowerArray(
            (pointer, value) => {
              __store_ref(pointer, __lowerString(value) || __notnull())
            },
            4,
            2,
            vals
          ) || __notnull()
        try {
          exports.validate(keys, vals)
        } finally {
          __release(keys)
        }
      }
    },
    exports
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
  return adaptedExports
}
export const {
  memory,
  ArrayOfStrings_ID,
  getModelName,
  getEndpoint,
  modelFactory,
  getPorts,
  getCommands,
  onUpdate,
  onDelete,
  validate,
} = await (async url =>
  instantiate(
    await (async () => {
      try {
        return await globalThis.WebAssembly.compileStreaming(
          globalThis.fetch(url)
        )
      } catch {
        return globalThis.WebAssembly.compile(
          await (await import('node:fs/promises')).readFile(url)
        )
      }
    })(),
    {
      aegis: __maybeDefault(__import0)
    }
  ))(new URL('release.wasm', import.meta.url))
function __maybeDefault (module) {
  return typeof module.default === 'object' && Object.keys(module).length == 1
    ? module.default
    : module
}

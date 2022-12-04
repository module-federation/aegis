import { callbackify } from 'node:util'
import { wasmAdapters } from '.'

import { EventBrokerFactory } from '../../../lib/domain'

/**@type {import('../../domain/event-broker').EventBroker} */
const broker = EventBrokerFactory.getInstance()

exports.importWebAssembly = function (remoteEntry) {
  async function instantiate (module, imports = {}) {
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
            throw Error(
              `${message} in ${fileName}:${lineNumber}:${columnNumber}`
            )
          })()
        },
        'Date.now':
          // ~lib/bindings/dom/Date.now() => f64
          Date.now,

        'console.log' (text) {
          // ~lib/bindings/dom/console.log(~lib/string/String) => void
          text = __liftString(text >>> 0)
          console.log(text)
        }
      })
    }

    const { exports } = await WebAssembly.instantiate(module, adaptedImports)
    console.log({ exports })

    const memory = exports.memory || imports.env.memory

    const adaptedExports = Object.setPrototypeOf(
      {
        lowerString: __lowerString,
        liftString: __liftString,
        lowerArray: __lowerArray,
        liftArray: __liftArray,
        notnull: __notnull,
        store_ref: __store_ref,
        _exports: exports,
        memory,

        getModelName () {
          // assembly/index/getModelName() => ~lib/string/String
          return __liftString(exports.getModelName() >>> 0)
        },

        getEndpoint () {
          // assembly/index/getEndpoint() => ~lib/string/String
          return __liftString(exports.getEndpoint() >>> 0)
        },

        getDomain () {
          // assembly/index/getDomain() => ~lib/string/String
          return __liftString(exports.getDomain() >>> 0)
        },

        ArrayOfStrings_ID: {
          // assembly/index/ArrayOfStrings_ID: u32
          valueOf () {
            return this.value
          },
          get value () {
            return exports.ArrayOfStrings_ID.value >>> 0
          }
        },

        modelFactory (obj) {
          const entries = Object.entries(obj)
            .filter(([k, v]) =>
              ['string', 'number', 'boolean'].includes(typeof v)
            )
            .map(([k, v]) => [k, v.toString()])

          const kv =
            __lowerArray(
              (pointer, value) => {
                __store_ref(
                  pointer,
                  __lowerArray(
                    (pointer, value) => {
                      __store_ref(pointer, __lowerString(value) || __notnull())
                    },
                    4,
                    2,
                    value
                  ) || __notnull()
                )
              },
              5,
              2,
              entries
            ) || __notnull()

          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,

            exports.modelFactory(kv) >>> 0
          )
            .map(([k, v]) => ({ [k]: v }))
            .reduce((a, b) => ({ ...a, ...b }))
        },

        getPorts () {
          // assembly/index/getPorts() => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.getPorts() >>> 0
          )
            .map(([k, v]) => ({ [k]: v }))
            .reduce((a, b) => ({ ...a, ...b }))
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
            .map(([k, v]) => ({ [k]: v }))
            .reduce((a, b) => ({ ...a, ...b }))
        },

        emitEvent (kv) {
          // assembly/index/emitEvent(~lib/array/Array<~lib/array/Array<~lib/string/String>>) => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
          kv =
            __lowerArray(
              (pointer, value) => {
                __store_ref(
                  pointer,
                  __lowerArray(
                    (pointer, value) => {
                      __store_ref(
                        pointer,
                        __lowerString(value.toString()) || __notnull()
                      )
                    },
                    4,
                    2,
                    value
                  ) || __notnull()
                )
              },
              5,
              2,
              kv
            ) || __notnull()

          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.emitEvent(kv) >>> 0
          )
        },

        onUpdate (kv) {
          // assembly/index/onUpdate(~lib/array/Array<~lib/array/Array<~lib/string/String>>) => ~lib/array/Array<~lib/array/Array<~lib/string/String>>
          kv =
            __lowerArray(
              (pointer, value) => {
                __store_ref(
                  pointer,
                  __lowerArray(
                    (pointer, value) => {
                      __store_ref(
                        pointer,
                        __lowerString(value.toString()) || __notnull()
                      )
                    },
                    4,
                    2,
                    value
                  ) || __notnull()
                )
              },
              5,
              2,
              kv
            ) || __notnull()

          return __liftArray(
            pointer =>
              __liftArray(
                pointer =>
                  __liftString(new Uint32Array(memory.buffer)[pointer >>> 2]),
                2,
                new Uint32Array(memory.buffer)[pointer >>> 2]
              ),
            2,
            exports.onUpdate(kv) >>> 0
          )
        },

        onDelete (kv) {
          // assembly/index/onDelete(~lib/array/Array<~lib/array/Array<~lib/string/String>>) => i8
          kv =
            __lowerArray(
              (pointer, value) => {
                __store_ref(
                  pointer,
                  __lowerArray(
                    (pointer, value) => {
                      __store_ref(pointer, __lowerString(value) || __notnull())
                    },
                    4,
                    2,
                    value
                  ) || __notnull()
                )
              },
              5,
              2,
              kv
            ) || __notnull()
          return exports.onDelete(kv)
        },

        validate (kv) {
          // assembly/index/validate(~lib/array/Array<~lib/array/Array<~lib/string/String>>) => void
          kv =
            __lowerArray(
              (pointer, value) => {
                __store_ref(
                  pointer,
                  __lowerArray(
                    (pointer, value) => {
                      __store_ref(pointer, __lowerString(value) || __notnull())
                    },
                    4,
                    2,
                    value
                  ) || __notnull()
                )
              },
              5,
              2,
              kv
            ) || __notnull()
          exports.validate(kv)
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
          throw Error(
            `invalid refcount '${refcount}' for reference '${pointer}'`
          )
      }
    }

    function __notnull (key) {
      throw TypeError(`value must not be null ${key}`)
    }

    function __store_ref (pointer, value) {
      new Uint32Array(memory.buffer)[pointer >>> 2] = value
    }

    return adaptedExports
  }

  async function compileStream (url) {
    try {
      return await globalThis.WebAssembly.compileStreaming(
        globalThis.fetch(url)
      )
    } catch {
      return globalThis.WebAssembly.compile(
        await (await import('node:fs/promises')).readFile(url)
      )
    }
  }

  const initWasm = async () => instantiate(await compileStream(remoteEntry.url))

  return initWasm().then(wasmExports =>
    wasmAdapters[remoteEntry.type](wasmExports)
  )
}

'use strict'
import { fetchWasm } from './fetch-wasm'
import loader from ""

export async function importWebAssemblies(remoteEntries, importObject) {
    const startTime = Date.now()

    const wasmModules = await Promise.all(
        remoteEntries
            .filter(entry => entry.wasm)
            .map(async function (entry) {
                if (!importObject) {
                    importObject = {
                        env: {
                            log: console.log
                        }
                    }
                }

                // Check if we support streaming instantiation
                if (!loader.instantiateStreaming)
                    console.log("we can't stream-compile wasm")

                const response = await fetchWasm(entry)

                const wasm = await loader.instantiate(response.asBase64Buffer(), {
                    env: {
                        log: value => console.log('from wasm' + value)
                    }
                })
                console.log('modelName:', wasm.exports.getModelName())

                return wasm
            })
    )

    console.info('wasm modules took %dms', Date.now() - startTime)

    return wasmModules
}

export async function importWebAssembly(remoteEntry, importObject) {
    const startTime = Date.now()

    if (!importObject) {
        importObject = {
            env: {
                log: () => console.log('wasm module imported')
            }
        }
    }

    // Check if we support streaming instantiation
    if (!WebAssembly.instantiateStreaming)
        console.log("we can't stream-compile wasm")

    const response = await fetchWasm(remoteEntry)

    const wasm = await AsBind.instantiate(response.asBase64Buffer(), {
        env: {
            log: value => console.log('from wasm' + value)
        }
    })
    console.log('modelName:', wasm.exports.getModelName())

    console.info('wasm modules took %dms', Date.now() - startTime)

    return wasm
}

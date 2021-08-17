'use strict'

import { fetchWasm } from './fetch-wasm'
import loader from '@assemblyscript/loader'

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
    if (!loader.instantiateStreaming) console.log("we can't stream-compile wasm")

    const response = await fetchWasm(remoteEntry)
    const wasm = await loader.instantiate(response.asBase64Buffer(), {
        env: {
            log: value => console.log('from wasm' + value)
        }
    })
    console.log('modelName:', wasm.exports.getModelName())
    console.info('wasm modules took %dms', Date.now() - startTime)
    return wrapWasmDomainModules(wasm)
}

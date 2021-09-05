'use strict'
const fs = require('fs')

const loader = require('@assemblyscript/loader')
//const { ObserverFactory } = require('../../domain/observer')
//const observer = ObserverFactory.getInstance()

// const { Octokit } = require('@octokit/rest')
// const token = process.env.GITHUB_TOKEN
// const octokit = new Octokit({ auth: token })

// function octoGet (entry) {
//   console.info('github url', entry.url)
//   const owner = entry.owner
//   const repo = entry.repo
//   const filedir = entry.filedir
//   const branch = entry.branch
//   return new Promise(function (resolve, reject) {
//     octokit
//       .request('GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}', {
//         owner,
//         repo,
//         filedir,
//         branch
//       })
//       .then(function (rest) {
//         const file = rest.data.find(datum => /\.wasm$/.test(datum.name))
//         return file.sha
//       })
//       .then(function (sha) {
//         console.log(sha)
//         return octokit.request('GET /repos/{owner}/{repo}/git/blobs/{sha}', {
//           owner,
//           repo,
//           sha
//         })
//       })
//       .then(function (rest) {
//         const buf = Buffer.from(rest.data.content, 'base64')
//         resolve({
//           toString: () => buf.toString('utf-8'),
//           asBase64Buffer: () => buf,
//           toUint16Array: () =>
//             new Uint16Array(
//               buf.buffer,
//               buf.byteOffset,
//               buf.length / Uint16Array.BYTES_PER_ELEMENT
//             )
//         })
//       })
//       .catch(err => reject(err))
//   })
// }

// function httpGet (params) {
//   return new Promise(function (resolve, reject) {
//     var req = require(params.protocol.slice(
//       0,
//       params.protocol.length - 1
//     )).request(params, function (res) {
//       if (res.statusCode < 200 || res.statusCode >= 300) {
//         return reject(new Error('statusCode=' + res.statusCode))
//       }
//       var body = []
//       res.on('data', function (chunk) {
//         body.push(chunk)
//       })
//       res.on('end', function () {
//         try {
//           body = Buffer.concat(body).toString()
//         } catch (e) {
//           reject(e)
//         }
//         resolve(body)
//       })
//     })
//     req.on('error', function (err) {
//       reject(err)
//     })
//     req.end()
//   })
// }

// exports.fetchWasm = function (entry) {
//   if (/github/i.test(entry.url)) return octoGet(entry)
//   return httpGet(entry.url)
// }

async function importWebAssembly () {
  const startTime = Date.now()

  // Check if we support streaming instantiation
  if (WebAssembly.instantiateStreaming) console.log('we can stream-compile now')

  //const response = await fetchWasm(remoteEntry)
  const wasm = await loader.instantiate(
    fs.readFileSync(__dirname + '/build/optimized.wasm'),
    {
      aegis: {
        log: ptr => handleAsync(console.log, ptr),

        invokePort: (portName, portConsumerEvent, portData) =>
          handleAsync(console.log, portName, portConsumerEvent, portData),

        invokeMethod: (methodName, methodData, moduleName) =>
          handleAsync(console.log, moduleName, methodName, methodData),

        websocketListen: (eventName, callbackName) => {
          console.debug('websocket listen invoked')

          if (wasm.then) {
            observer.listen(eventName, eventData => {
              const cmd = adapter.findWasmCommand(getString(callbackName))
              if (typeof cmd === 'function') {
                handleAsync(adapter.callWasmFunction, eventData)
              }
              console.log('no command found')
            })
          }
        },
        websocketNotify: (eventName, eventData) =>
          handleAsync(observer.notify, eventName, eventData),

        requestDeployment: (webswitchId, remoteEntry) =>
          handleAsync(console.log, webswitchId, remoteEntry)
      }
    }
  )
  console.info('wasm modules took %dms', Date.now() - startTime)

  function handleAsync (fn, ...ptr) {
    const ptrArray = ptr instanceof Array ? ptr : [ptr]
    if (wasm.then) {
      return wasm.then(inst =>
        fn(...ptrArray.map(p => inst.exports.__getString(p)))
      )
    } else if (wasm?.exports && wasm.exports.__getString) {
      return fn(...ptr.map(p => wasm.exports.__getString(p)))
    } else {
      console.log('no ref to module')
    }
  }

  // if (type === 'model') return wrapWasmModelSpec(wasm)
  // if (type === 'adapter') return wrapWasmAdapter(wasm)
  // if (type === 'service') return wrapWasmService(wasm)

  return wasm
}

module.exports = importWebAssembly().then(instance => instance)

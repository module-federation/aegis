'use strict'

/**
 *
 * @param {import("../use-cases/add-model").addModel} addModel
 * @param {function():string} hash
 * @returns {import("./http-adapter").httpController}
 */
export default function makeLiveUpdate (hotReload) {
  return async function liveUpdate (httpRequest) {
    try {
      httpRequest.log(hotReload.name)
      const modelName = httpRequest.query.modelName
      const remoteEntry = httpRequest.query.remoteEntry
      const msg = await hotReload({ modelName, remoteEntry })
      console.debug({ function: liveUpdate.name, output: modelName })

      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toUTCString()
        },
        statusCode: 201,
        body: {
          function: liveUpdate.name,
          input: httpRequest.query,
          output: msg
        }
      }
    } catch (e) {
      console.error(e)

      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: 400,
        body: {
          error: e.message
        }
      }
    }
  }
}

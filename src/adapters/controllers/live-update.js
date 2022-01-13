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

      const msg = await hotReload(httpRequest.body)

      console.debug({ function: liveUpdate.name, output: model })

      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toUTCString()
        },
        statusCode: 201,
        body: { status: msg }
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

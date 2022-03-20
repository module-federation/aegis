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
      httpRequest.log(liveUpdate.name)

      const result = await hotReload(httpRequest.query.modelName.toUpperCase())

      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toUTCString()
        },
        statusCode: 200,
        body: { fn: liveUpdate.name, result }
      }
    } catch (error) {
      console.error({ error })

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

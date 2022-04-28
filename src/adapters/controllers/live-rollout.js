'use strict'

/**
 *
 * @param {import("../use-cases/add-model").addModel} addModel
 * @param {function():string} hash
 * @returns {import("./http-adapter").httpController}
 */
export default function makeLiveRollout (hotDeploy) {
  return async function liveRollout (httpRequest) {
    try {
      httpRequest.log(liveRollout.name)

      const result = await hotDeploy(httpRequest.query.remoteEntry)

      console.debug({ fn: liveRollout.name, result })
      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toUTCString()
        },
        statusCode: 200,
        body: { result }
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

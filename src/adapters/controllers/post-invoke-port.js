'use strict'

/**
 *
 * @param {import("../use-cases/add-model").invokePort} invokePort
 * @param {function():string} hash
 * @returns {import("./http-adapter").httpController}
 */
export default function anyInvokePortFactory (invokePort) {
  return async function anyInvokePort (httpRequest) {
    try {
      httpRequest.log(anyInvokePort.name)
      const result = await invokePort({
        port: httpRequest.params.port,
        args: httpRequest.body,
        method: httpRequest.method,
        headers: httpRequest.headers,
        path: httpRequest.path,
        id: httpRequest.params.id || null
      })

      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toISOString()
        },
        statusCode: 201,
        body: { ...result }
      }
    } catch (e) {
      console.error(e)

      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: e.code || 400,
        body: {
          error: e.message
        }
      }
    }
  }
}

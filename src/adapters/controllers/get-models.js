'use strict'
import { Readable, Transform } from 'stream'
import getContent from './get-content'

function isStream (models) {
  return (
    models?.length > 0 &&
    (models[0] instanceof Readable || models[0] instanceof Transform)
  )
}

/**
 *
 * @param {import("../use-cases/list-models").listModels} listModels
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function getModelsFactory (listModels) {
  return async function getModels (httpRequest) {
    try {
      httpRequest.log(getModels.name)

      const models = await listModels({
        query: httpRequest.query,
        writable: httpRequest.res
      })

      if (isStream()) return

      const { content, contentType } = getContent(httpRequest, models)

      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
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

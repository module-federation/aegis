'use strict'
import getContent from './get-content'

/**
 *
 * @param {import("../use-cases/list-models").listModels} listModels
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function getModelsFactory (listModels) {
  return async function getModels (httpRequest) {
    try {
      httpRequest.log(getModels.name)

      const models = await listModels(httpRequest.query)

      const { content, contentType } = getContent(
        httpRequest,
        models,
        models.length > 0 ? models[0].modelName : 'Not Found'
      )

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
        statusCode: 400,
        body: {
          error: e.message
        }
      }
    }
  }
}

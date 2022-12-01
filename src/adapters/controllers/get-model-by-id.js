import getContent from './get-content'

/**
 * @param {import("../use-cases/find-model").findModel} findModel
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function getModelByIdFactory (findModel) {
  return async function getModelById (httpRequest) {
    try {
      httpRequest.log(getModelById.name)

      const model = await findModel({
        id: httpRequest.params.id,
        query: httpRequest.query
      })

      const { content, contentType } = getContent(
        httpRequest,
        model,
        model.modelName
      )

      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      }
    } catch (e) {
      console.error(e.message)

      if (e.message === 'Not Found') {
        return {
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 404,
          body: {
            error: e.message
          }
        }
      }

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

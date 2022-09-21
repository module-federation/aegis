import getContent from './get-content'

/**
 * @param {import("../use-cases/find-model").findModel} findModel
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function getModelByIdFactory (findModel) {
  return async function getModelById (httpRequest) {
    try {
      httpRequest.log(getModelById.name)

      const id = httpRequest.params.id
      const query = httpRequest.query
      const model = await findModel({ id, query })

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

      if (e.message === 'no such id') {
        return {
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 404
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

/**
 *
 * @param {import("../../domain/use-cases/remove-model").removeModel} removeModel
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function deleteModelFactory (removeModel) {
  return async function deleteModel (httpRequest) {
    httpRequest.log(deleteModel.name)
    try {
      const model = await removeModel(httpRequest.params.id)

      return {
        headers: {
          'Content-Type': 'application/json',
          'Last-Modified': new Date().toUTCString()
        },
        statusCode: 201,
        body: { modelId: model.id }
      }
    } catch (e) {
      console.error(e)

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

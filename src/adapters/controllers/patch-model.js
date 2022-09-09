/**
 *
 * @param {import("../../domain/use-cases/edit-model.js").editModel} editModel
 * @returns {import("../http-adapter").httpController}
 */
export default function patchModelFactory (editModel) {
  return async function patchModel (httpRequest) {
    try {
      httpRequest.log(patchModel.name)

      const model = await editModel({
        id: httpRequest.params.id,
        changes: httpRequest.body,
        command: httpRequest.params.command
      })

      console.log(model)
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
        statusCode: 400,
        body: {
          error: e.message
        }
      }
    }
  }
}

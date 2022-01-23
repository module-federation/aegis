/**
 *
 * @param {import("../../domain/use-cases/edit-model.js").editModel} editModel
 * @returns {import("../http-adapter").httpController}
 */
export default function patchModelFactory (editModel) {
  return async function patchModel (httpRequest) {
    try {
      httpRequest.log(patchModel.name)

      const id = httpRequest.params.id
      const command = httpRequest.params.command
      const changes = httpRequest.body

      const model = await editModel({ id, changes, command })

      console.debug(model)
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

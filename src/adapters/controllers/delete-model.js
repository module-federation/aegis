import { isMainThread, workerData } from 'worker_threads'

/**
 *
 * @param {import("../../domain/use-cases/remove-model").removeModel} removeModel
 * @returns {import("../adapters/http-adapter").httpController}
 */
export default function deleteModelFactory (removeModel, ThreadPool) {
  return async function deleteModel (httpRequest) {
    httpRequest.log(deleteModel.name)
    try {
      if (isMainThread) {
        const { ThreadPool } = require('../../services/thread-pool')
        await ThreadPool.runTask(removeModel.name, httpRequest.params.id)
      } else {
        const httpRequest = workerData
        const model = await removeModel(httpRequest.params.id)

        return {
          headers: {
            'Content-Type': 'application/json',
            'Last-Modified': new Date().toUTCString()
          },
          statusCode: 201,
          body: { modelId: model.getId() }
        }
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

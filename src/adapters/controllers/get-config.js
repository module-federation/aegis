'use strict'
import getContent from './get-content'

export default function getConfigFactory (listConfigs) {
  return async function getConfig (httpRequest) {
    try {
      httpRequest.log(getConfig.name)

      const configs = await listConfigs(httpRequest.query)
      const { contentType, content } = getContent(
        httpRequest,
        configs,
        'Model Specifications'
      )

      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      }
    } catch (e) {
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

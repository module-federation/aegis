'use strict'

const requiredMethods = ['connect', 'publish', 'subscribe', 'close']
const pluginName = process.env.SERVICE_MESH_PLUGIN || 'webswitch'

export default function makeServiceMesh ({ broker, models, repository }) {
  return async function (options) {
    const plugin = await models.createModel(
      broker,
      repository,
      pluginName,
      options
    )
    const missingMethods = requiredMethods.filter(method => !plugin[method])

    if (missingMethods.length > 0)
      throw new Error(
        `ServiceMesh plug-in is missing required methods ${missingMethods}`
      )

    return plugin
  }
}

'use strict'

const requiredMethods = ['connect', 'publish', 'subscribe', 'close']
const pluginName = process.env.SERVICE_MESH_PLUGIN || 'webswitch'

export default function makeServiceMesh ({ broker, models, repository }) {
  return function (options) {
    const plugin = models.createModel(broker, repository, pluginName, options)
    const missingMethods = requiredMethods.filter(method => !plugin[method])
    const msg = `ServiceMesh plug-in is missing required methods ${missingMethods}`

    if (missingMethods.length > 0) {
      console.error({ fn: makeServiceMesh.n, msg })
      //throw new Error(msg)
    }

    return plugin
  }
}

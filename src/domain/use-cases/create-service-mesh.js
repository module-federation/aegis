'use strict'
import { serviceMeshPlugin } from '.'

const requiredMethods = ['connect', 'publish', 'subscribe', 'close']

export default function makeServiceMesh ({ broker, models, repository }) {
  return function (options) {
    const plugin = models.createModel(
      broker,
      repository,
      serviceMeshPlugin,
      options
    )
    //const missingMethods = requiredMethods.filter(method => !plugin[method])

    // if (missingMethods.length > 0)
    //   throw new Error(
    //     `ServiceMesh plug-in is missing required methods ${missingMethods}`
    //   )

    return plugin
  }
}

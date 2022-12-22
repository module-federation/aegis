'use strict'
import { serviceMeshPlugin } from '.'

export default function makeServiceMesh({ broker, models, repository }) {
  return function (options) {
    const plugin = models.createModel(
      broker,
      repository,
      serviceMeshPlugin,
      options
    )

    if (!plugin) throw new Error('failed to generate service mesh plugin')

    return plugin
  }
}

'use strict'

import * as options from '../adapters/service-mesh'
import { attachServer } from '../adapters/service-mesh'
const service = options[process.env.SERVICEMESH] || options.WebSwitch

export const ServiceMesh = {
  ...Object.keys(options.MeshAdapter)
    .map(k => ({ [k]: options.MeshAdapter[k](service) }))
    .reduce((a, b) => ({ ...a, ...b })),
  attachServer
}

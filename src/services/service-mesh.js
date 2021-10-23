'use strict'

import * as options from '../adapters/service-mesh'
import { attachServer } from '../adapters/service-mesh'
import configFile from '../../public/aegis.config.json'

console.log('options', options)
const config = configFile.env.serviceMesh
const enabled = Object.entries(config)
  .filter(([, v]) => v.enabled)
  .map(([k]) => k)
  .reduce(k => k)
const service = enabled || 'WebSwitch'

export const MeshService = {
  ...Object.keys(options.MeshAdapter)
    .map(k => ({ [k]: options.MeshAdapter[k](options[service]) }))
    .reduce((a, b) => ({ ...a, ...b })),
  attachServer
}

console.debug(MeshService)

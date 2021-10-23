'use strict'

import * as MeshLink from './mesh-link'
import * as WebSwitch from './web-node'
import * as QuicMesh from './quic-mesh'
import * as NatsMesh from './nats-mesh'
import { attachServer } from './web-switch'
import { MeshAdapter } from '../../adapters'


import configFile from '../../../public/aegis.config.json'
const options = { MeshLink, WebSwitch, QuicMesh, NatsMesh, attachServer }
console.log('options', options)

const config = configFile.env.serviceMesh
const enabled = Object.entries(config)
  .filter(([, v]) => v.enabled)
  .map(([k]) => k)
  .reduce(k => k)
const service = enabled || 'WebSwitch'

export const MeshService = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](options[service]) }))
    .reduce((a, b) => ({ ...a, ...b })),
  attachServer
}

console.debug(MeshService)

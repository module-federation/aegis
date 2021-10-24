'use strict'

import * as MeshLink from './mesh-link'
import * as WebSwitch from './web-node'
//import * as QuicMesh from './quic-mesh'
//import * as NatsMesh from './nats-mesh'
import { ServiceMeshAdapter } from '../../adapters'
import { attachServer } from './web-switch'
import config from '../../../public/aegis.config.json'

const options = {
  WebSwitch,
  MeshLink
  //QuicMesh,
  //NatsMesh
}

const service =
  Object.entries(config.services.serviceMesh)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k)
    .reduce(k => k) || 'WebSwitch'

console.log(options)
console.log(options[service])

export const MeshService = {
  ...Object.keys(ServiceMeshAdapter)
    .map(k => ({ [k]: ServiceMeshAdapter[k](options[service]) }))
    .reduce((a, b) => ({ ...a, ...b })),
  attachServer
}

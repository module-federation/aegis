'use strict'

import * as MeshLink from './mesh-link'
import * as WebSwitch from './webswitch'
import * as QuicMesh from './quic-mesh'
import * as NatsMesh from './nats-mesh'
import * as MeshAdapter from '../../adapters/service-mesh'
import config from '../../../public/aegis.config.json'

const options = {
  WebSwitch,
  MeshLink,
  QuicMesh,
  NatsMesh
}

const enabled =
  Object.entries(config.services.serviceMesh)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k)
    .reduce(k => k) || 'WebSwitch'

const service =
  enabled === config.services.activeServiceMesh ? enabled : 'WebSwitch'

const MeshService = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](options[service]) }))
    .reduce((a, b) => ({ ...a, ...b }))
}

console.log(MeshService)
export default MeshService

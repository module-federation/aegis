'use strict'

import * as MeshLink from './mesh-link'
import * as WebSwitch from './webswitch'
import * as QuicMesh from './quic-mesh'
import * as NatsMesh from './nats-mesh'
import { MeshAdapter } from '../../adapters'
import config from '../../../public/aegis.config.json'

const options = {
  WebSwitch,
  MeshLink,
  QuicMesh,
  NatsMesh
}

const service =
  Object.entries(config.services.serviceMesh)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k)
    .reduce(k => k) || 'WebSwitch'

export default MeshService = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](options[service]) }))
    .reduce((a, b) => ({ ...a, ...b }))
}

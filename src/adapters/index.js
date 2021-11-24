'use strict'

export * from './file-system'
export * as StorageAdapter from './persistence'
export { ServerlessAdapter } from './serverless'
export * as controllers from './controllers'
export * as webassembly from './webassembly'

import * as MeshAdapter from './service-mesh'
import { MeshService } from '../services'

/**
 * @callback attachServer
 * @param {import('ws/lib/websocket-server')} server
 */

/**
 * @callback publish
 * @param {object} event
 */

/**
 * @callback eventCallback
 * @param {*} eventData
 */

/**
 * @callback subscribe
 * @param {string} eventName
 * @param {eventCallback} callback
 */

/**
 * Service Mesh plugin adapter interface.
 * @typedef {object} ServiceMeshAdapter
 * @property {attachServer} attachServer all service mesh plugins will
 * implement a websocket server on the same port as the API. This func
 * passes the handle for the socket.
 * @property {publish} publish publish an event to the service mesh
 * @property {subscribe} subscribe subscribe to events on the service mesh
 */

/**
 * @type {ServiceMeshAdapter}
 */
export const ServiceMeshAdapter = {
  ...Object.keys(MeshAdapter)
    .map(k => ({ [k]: MeshAdapter[k](MeshService) }))
    .reduce((a, b) => ({ ...a, ...b }))
}

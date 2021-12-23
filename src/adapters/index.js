'use strict'

export * from './file-system'
export * as StorageAdapter from './persistence'
export { ServerlessAdapter } from './serverless'
export * as controllers from './controllers'
export * as webassembly from './webassembly'

import * as ServiceMeshPluginAdapter from './service-mesh'
import { ServiceMeshPlugin } from '../services'

/**
 * @callback attachServer
 * @param {import('ws/lib/websocket-server')} server
 */

/**
 * @callback publish
 * @param {object} event
 * @returns {Promise<void>}
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
 * @callback connectMeshType
 * @param {*} [serviceInfo]
 * @returns {Promise<void>}
 */

/**
 * service mesh plugin adapter
 * @typedef {object} ServiceMeshAdapter
 * @property {attachServer} attachServer all service mesh plug-ins
 * implement a websocket server on the same port as the domain model
 * API, regardless of how they integrate the nodes of the mesh, which
 * can be based on an entirely different transport protocol, e.g. UDP 
 * instead of TCP. This function simply passes the server socket handle
 * to the mesh, which then listens for requests from http clents to 
 * upgrade to ws protocol, at which point clients can avail themselves
 * of mesh services, e.g. such as subscribing to an event stream.
 * @property {publish} publish publish an event to the service mesh
 * @property {subscribe} subscribe subscribe to events on the service mesh
 * @property {connectMeshType} connect take care of any initialization tasks
 */

/**
 * Bind the adapter to the service
 * @type {ServiceMeshAdapter}
 */
export const ServiceMeshAdapter = {
  ...Object.keys(ServiceMeshPluginAdapter)
    .map(port => ({
      [port]: ServiceMeshPluginAdapter[port](ServiceMeshPlugin)
    }))
    .reduce((a, b) => ({ ...a, ...b }))
}

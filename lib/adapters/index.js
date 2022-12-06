'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  ServiceMeshAdapter: true,
  StorageAdapter: true,
  ServerlessAdapter: true,
  controllers: true,
  webassembly: true
};
Object.defineProperty(exports, "ServerlessAdapter", {
  enumerable: true,
  get: function () {
    return _serverless.ServerlessAdapter;
  }
});
exports.webassembly = exports.controllers = exports.StorageAdapter = exports.ServiceMeshAdapter = void 0;
var _fileSystem = require("./file-system");
Object.keys(_fileSystem).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _fileSystem[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _fileSystem[key];
    }
  });
});
var _StorageAdapter = _interopRequireWildcard(require("./persistence"));
exports.StorageAdapter = _StorageAdapter;
var _serverless = require("./serverless");
var _controllers = _interopRequireWildcard(require("./controllers"));
exports.controllers = _controllers;
var _webassembly = _interopRequireWildcard(require("./webassembly"));
exports.webassembly = _webassembly;
var ServiceMeshServerImpl = _interopRequireWildcard(require("./service-mesh/server"));
var _services = require("../services");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
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
 * @typedef {import('ws').WebSocketServer} wss
 * @typedef {import('tls').SecureContext} secureCtx
 * @typedef {object} ServiceMeshAdapter
 * @property {function(wss,secureCtx):wss} attachServer all service mesh plug-ins
 * implement a websocket server on the same port as the domain model
 * API, regardless of how they integrate the nodes of the mesh, which
 * can be based on an entirely different transport protocol, e.g. UDP
 * instead of TCP. This function simply passes the server socket handle
 * to the mesh, which then listens for requests from http clents to
 * upgrade to ws protocol, at which point clients can avail themselves
 * of mesh services, e.g. such as subscribing to an event stream.
 * @property {function({eventName:string,event:object}):void} publish publish an event to the service mesh
 * @property {subscribe} subscribe subscribe to events on the service mesh
 * @property {connectMeshType} connect take care of any initialization tasks
 */

/**
 * Bind the adapter.
 * @type {ServiceMeshAdapter}
 */
const ServiceMeshAdapter = {
  ...Object.keys(ServiceMeshServerImpl).map(port => ({
    [port]: ServiceMeshServerImpl[port](_services.ServiceMeshPlugin)
  })).reduce((a, b) => ({
    ...a,
    ...b
  }))
};
exports.ServiceMeshAdapter = ServiceMeshAdapter;
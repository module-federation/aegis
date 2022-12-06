'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WebSwitch = exports.QuickMesh = exports.NatsMesh = exports.MeshLink = void 0;
var _MeshLink = _interopRequireWildcard(require("./mesh-link"));
exports.MeshLink = _MeshLink;
var _WebSwitch = _interopRequireWildcard(require("./web-switch"));
exports.WebSwitch = _WebSwitch;
var _QuickMesh = _interopRequireWildcard(require("./quic-mesh"));
exports.QuickMesh = _QuickMesh;
var _NatsMesh = _interopRequireWildcard(require("./nats-mesh"));
exports.NatsMesh = _NatsMesh;
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
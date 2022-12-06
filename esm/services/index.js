"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CertificateService = exports.AuthorizationService = void 0;
Object.defineProperty(exports, "CircuitBreaker", {
  enumerable: true,
  get: function () {
    return _circuitBreaker.default;
  }
});
exports.WhoIsService = exports.StorageService = exports.ServiceMeshPlugin = exports.EventService = exports.DnsService = exports.ClusterService = void 0;
var _AuthorizationService = _interopRequireWildcard(require("./auth"));
exports.AuthorizationService = _AuthorizationService;
var _ClusterService = _interopRequireWildcard(require("./cluster"));
exports.ClusterService = _ClusterService;
var _EventService = _interopRequireWildcard(require("./event-bus"));
exports.EventService = _EventService;
var _StorageService = _interopRequireWildcard(require("./persistence"));
exports.StorageService = _StorageService;
var _circuitBreaker = _interopRequireDefault(require("../domain/circuit-breaker"));
var _dns = require("./middleware/network/dns");
var _cert = require("./cert");
var MeshServices = _interopRequireWildcard(require("./service-mesh"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const DnsService = _dns.dns;
exports.DnsService = DnsService;
const WhoIsService = _dns.whois;
exports.WhoIsService = WhoIsService;
const CertificateService = {
  provisionCert: (0, _cert.initCertificateService)(_dns.dns, _dns.whois)
};
exports.CertificateService = CertificateService;
const config = require('../config').hostConfig;
const designatedService = config.services.activeServiceMesh;

/**
 * Which mesh service implementations are enabled?
 */
const enabledServices = Object.entries(config.services.serviceMesh).filter(([, v]) => v.enabled).map(([k]) => k) || ['WebSwitch'];

/**
 * Which mesh service do we use?
 */
const service = enabledServices.includes(designatedService) ? designatedService : 'WebSwitch';
const ServiceMeshPlugin = MeshServices[service];
exports.ServiceMeshPlugin = ServiceMeshPlugin;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getParsers = exports.ServerlessAdapter = void 0;
var _serverlessAdapter = require("./serverless-adapter");
var localParsers = _interopRequireWildcard(require("./parsers"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const getRemoteParsers = async () => Promise.resolve().then(() => _interopRequireWildcard(require('aegis-services/parsers')))``;
const getParsers = async function () {
  try {
    const remoteParsers = await getRemoteParsers();
    if (!remoteParsers) return localParsers;
    return {
      ...localParsers,
      ...remoteParsers
    };
  } catch (e) {
    console.error('serverless.parsers', e.message);
  }
  return localParsers;
};
exports.getParsers = getParsers;
const ServerlessAdapter = () => (0, _serverlessAdapter.makeServerlessAdapter)(getParsers);
exports.ServerlessAdapter = ServerlessAdapter;
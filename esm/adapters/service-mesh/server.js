'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachServer = attachServer;
function attachServer(service) {
  return async function (server) {
    service.attachServer(server);
  };
}
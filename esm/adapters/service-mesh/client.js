'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.close = close;
exports.connect = connect;
exports.publish = publish;
exports.subscribe = subscribe;
function connect(service) {
  return async function (serviceInfo = {}) {
    service.connect(serviceInfo);
  };
}
function publish(service) {
  return async function (event) {
    //console.debug({ service, event })
    service.publish(event);
  };
}
function subscribe(service) {
  return async function (event, callback) {
    service.subscribe(event, callback);
  };
}
function close(service) {
  return function (reason) {
    service.close('reload');
  };
}
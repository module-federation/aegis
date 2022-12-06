"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requestContext = void 0;
var _async_hooks = require("async_hooks");
/** @type {AsyncLocalStorage<Map<string, object>>} */
const requestContext = new _async_hooks.AsyncLocalStorage();
exports.requestContext = requestContext;
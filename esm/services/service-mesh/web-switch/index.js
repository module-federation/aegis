"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _switch = require("./switch");
Object.keys(_switch).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _switch[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _switch[key];
    }
  });
});
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _expressless = require("./expressless");
Object.keys(_expressless).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _expressless[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _expressless[key];
    }
  });
});
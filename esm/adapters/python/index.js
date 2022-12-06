"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _pythonImport = require("./python-import");
Object.keys(_pythonImport).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pythonImport[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _pythonImport[key];
    }
  });
});
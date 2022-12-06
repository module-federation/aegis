"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _namecheap = require("./namecheap");
Object.keys(_namecheap).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _namecheap[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _namecheap[key];
    }
  });
});
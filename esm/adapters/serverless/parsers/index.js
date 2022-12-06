"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _awsParser = require("./aws-parser");
Object.keys(_awsParser).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _awsParser[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _awsParser[key];
    }
  });
});
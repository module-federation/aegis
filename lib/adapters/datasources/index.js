"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  dsClasses: true
};
exports.dsClasses = void 0;
var _datasourceMemory = require("./datasource-memory");
Object.keys(_datasourceMemory).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _datasourceMemory[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _datasourceMemory[key];
    }
  });
});
var _datasourceFile = require("./datasource-file");
Object.keys(_datasourceFile).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _datasourceFile[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _datasourceFile[key];
    }
  });
});
var _datasourceMongodb = require("./datasource-mongodb");
Object.keys(_datasourceMongodb).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _datasourceMongodb[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _datasourceMongodb[key];
    }
  });
});
// export * from './datasource-ipfs'
// export * from './datasource-solidpod'

const dsClasses = {
  [_datasourceFile.DataSourceFile.name]: _datasourceFile.DataSourceFile,
  [_datasourceMemory.DataSourceMemory.name]: _datasourceMemory.DataSourceMemory,
  [_datasourceMongodb.DataSourceMongoDb.name]: _datasourceMongodb.DataSourceMongoDb
};
exports.dsClasses = dsClasses;
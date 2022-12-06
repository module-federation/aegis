'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = makeServiceMesh;
var _ = require(".");
function makeServiceMesh({
  broker,
  models,
  repository
}) {
  return function (options) {
    const plugin = models.createModel(broker, repository, _.serviceMeshPlugin, options);
    if (!plugin) throw new Error('failed to generate service mesh plugin');
    return plugin;
  };
}
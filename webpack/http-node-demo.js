const LoaderTargetPlugin = require("webpack/lib/LoaderTargetPlugin");

/**
 * 
 * @param {import("webpack").Compiler} compiler
 */
module.exports = (compiler) => {
  const NodeTemplatePlugin = require("./NodeTemplatePlugin");
  const NodeTargetPlugin = require("webpack/lib/node/NodeTargetPlugin");
  new NodeTemplatePlugin({
    asyncChunkLoading: true
  }).apply(compiler);
  new NodeTargetPlugin().apply(compiler);
  new LoaderTargetPlugin("node").apply(compiler);
};

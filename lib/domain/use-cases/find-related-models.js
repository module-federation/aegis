'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetchRelatedModels;
var _asyncError = _interopRequireDefault(require("../util/async-error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @param {import("./model").Model} model
 * @param {import('../model').} relation
 */
async function fetchRelatedModels(model, relation) {
  const spec = model.getSpec();
  if (relation && spec.relations && spec.relations[relation]) {
    const result = await (0, _asyncError.default)(model[relation]());
    if (result.ok) {
      return {
        [model.getName()]: model,
        [relation.toUpperCase()]: result.data
      };
    }
  }
  return model;
}
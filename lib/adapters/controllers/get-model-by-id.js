"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getModelByIdFactory;
var _getContent = _interopRequireDefault(require("./get-content"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @param {import("../use-cases/find-model").findModel} findModel
 * @returns {import("../adapters/http-adapter").httpController}
 */
function getModelByIdFactory(findModel) {
  return async function getModelById(httpRequest) {
    try {
      httpRequest.log(getModelById.name);
      const model = await findModel({
        id: httpRequest.params.id,
        query: httpRequest.query
      });
      const {
        content,
        contentType
      } = (0, _getContent.default)(httpRequest, model, model.modelName);
      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      };
    } catch (e) {
      console.error(e.message);
      if (e.message === 'Not Found') {
        return {
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 404,
          body: {
            error: e.message
          }
        };
      }
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: e.code || 400,
        body: {
          error: e.message
        }
      };
    }
  };
}
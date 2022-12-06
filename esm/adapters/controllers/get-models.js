'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getModelsFactory;
var _getContent = _interopRequireDefault(require("./get-content"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 *
 * @param {import("../use-cases/list-models").listModels} listModels
 * @returns {import("../adapters/http-adapter").httpController}
 */
function getModelsFactory(listModels) {
  return async function getModels(httpRequest) {
    try {
      httpRequest.log(getModels.name);
      const models = await listModels({
        query: httpRequest.query,
        writable: httpRequest.res
      });
      if (!models) {
        httpRequest.stream = true;
        return;
      }
      const {
        content,
        contentType
      } = (0, _getContent.default)(httpRequest, models);
      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      };
    } catch (e) {
      console.error(e);
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
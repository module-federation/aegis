'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getConfigFactory;
var _getContent = _interopRequireDefault(require("./get-content"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function getConfigFactory(listConfigs) {
  return async function getConfig(httpRequest) {
    try {
      httpRequest.log(getConfig.name);
      const configs = await listConfigs(httpRequest.query);
      const {
        contentType,
        content
      } = (0, _getContent.default)(httpRequest, configs);
      return {
        headers: {
          'Content-Type': contentType
        },
        statusCode: 200,
        body: content
      };
    } catch (e) {
      return {
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: 400,
        body: {
          error: e.message
        }
      };
    }
  };
}
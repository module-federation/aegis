'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Persistence = void 0;
var _datasourceFactory = _interopRequireDefault(require("../domain/datasource-factory"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Bind adapter to service.
 */
const Persistence = {
  async save(model) {
    return _datasourceFactory.default.getSharedDataSource(model.getName()).save(model.getId(), model);
  },
  async find(model) {
    return _datasourceFactory.default.getSharedDataSource(model.getName()).find(model.getId());
  },
  close() {}
};
exports.Persistence = Persistence;
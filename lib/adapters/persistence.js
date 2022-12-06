'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.close = close;
exports.find = find;
exports.remove = remove;
exports.save = save;
exports.update = update;
var _asyncError = _interopRequireDefault(require("../domain/util/async-error"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function save(service) {
  return async function ({
    model
  }) {
    const result = await (0, _asyncError.default)(service.save(model));
    if (result.ok) {
      return result.data;
    }
    throw new Error(result.error);
  };
}
function remove(service) {
  return async function ({
    model
  }) {
    const result = await (0, _asyncError.default)(service.delete(model));
    if (result.ok) {
      return result.data;
    }
    throw new Error(result.error);
  };
}
function find(service) {
  return async function ({
    model
  }) {
    const result = await (0, _asyncError.default)(service.find(model));
    if (result.ok) {
      return result.data;
    }
    throw new Error(result.error);
  };
}
function update(service) {
  return async function ({
    model,
    args: [changes]
  }) {
    const result = await (0, _asyncError.default)(service.update(model, changes));
    if (result.ok) {
      return result.data;
    }
    throw new Error(result.error);
  };
}
function close(service) {
  return function () {
    try {
      service.close();
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  };
}
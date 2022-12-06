'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = checkAcl;
var _makeArray = _interopRequireDefault(require("./make-array"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function checkAcl(requirement, allow, deny = []) {
  console.log({
    func: checkAcl.name,
    requirement,
    allow
  });
  return (0, _makeArray.default)(requirement).some(r => (0, _makeArray.default)(allow).includes(r)) && (0, _makeArray.default)(requirement).every(r => !(0, _makeArray.default)(deny).includes(r));
}
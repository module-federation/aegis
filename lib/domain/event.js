'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _mixins = require("./mixins");
var _uuid = _interopRequireDefault(require("../domain/util/uuid"));
var _pipe = _interopRequireDefault(require("./util/pipe"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @typedef {import('./model-factory').EventType} EventType
 */

/**
 * @typedef {{
 *  factory: function(*):any,
 *  args: any,
 *  eventType: EventType,
 *  modelName: String
 * }} options
 */

/**
 * @typedef {Object} Event
 * @property {import('.').Model} model
 * @property {string} modelId
 * @property {string} eventId
 * @property {String} eventName
 * @property {String} modelName
 * @property {number} eventTime
 * @property {object} [eventData]
 * @property {string} [eventCode]
 * @property {number} [eventRank]
 * @property {string[]} [eventTags]
 * @property {string} [eventSource]
 * @property {string} [eventTarget]
 * @property {EventType} [eventType]
 */

/**
 * @namespace
 */
const Event = (() => {
  /**
   * @lends Event
   * @namespace
   * @class
   * @param {options} options
   * @returns {Readonly<Event>}
   */
  const Event = ({
    factory,
    args = {},
    eventType,
    eventName,
    modelName
  } = {}) => ({
    eventName: eventName || (eventType && modelName && eventType.concat(modelName)).toUpperCase(),
    eventType,
    modelName,
    eventSource: modelName?.toUpperCase(),
    ...(factory ? factory(args) : args)
  });
  const makeEvent = (0, _pipe.default)(Event, (0, _mixins.withTimestamp)('eventTime'), (0, _mixins.withId)('eventId', _uuid.default), Object.freeze);
  return {
    /**
     * Create event
     * @param {options} options
     * @returns {Readonly<Event>}
     */
    create: options => makeEvent(options)
  };
})();
var _default = Event;
exports.default = _default;
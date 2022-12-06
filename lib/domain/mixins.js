'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withbroker = exports.withTimestamp = exports.withSerializers = exports.withId = exports.withDeserializers = exports.toSymbol = exports.time = exports.fromTimestamp = exports.fromSymbol = void 0;
var _pipe = _interopRequireDefault(require("./util/pipe"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * @callback functionalMixin
 * @param {Object} o - Object to compose
 * @returns {Object} - Composed object
 */

/**
 * @callback functionalMixinFactory
 * @param {*} mixinFunctionParams params for mixin function
 * @returns {functionalMixin}
 */

/**
 *
 */
const time = () => new Date().getTime();

/**
 * Add a unique identifier
 * @param {Function} fnCreateId function that returns unique id
 */
exports.time = time;
const withId = (propName, fnCreateId) => {
  return o => ({
    ...o,
    [propName]: fnCreateId()
  });
};

/**
 * Add a timestamp
 * @param {string} propName name of property to add
 * @param {Function} [fnTimestamp] default is UTC
 */
exports.withId = withId;
const withTimestamp = (propName, fnTimestamp = time) => {
  return o => ({
    [propName]: fnTimestamp(),
    ...o
  });
};

/**
 * Convert keys from symbols to strings when
 * the object is serialized so the properties
 * can be seen in JSON output.
 * @param {{key: string, value: Symbol}} keyMap
 */
exports.withTimestamp = withTimestamp;
const fromSymbol = keyMap => o => {
  const stringifySymbols = () => Object.keys(keyMap).map(k => ({
    [k]: o[keyMap[k]]
  })).reduce((p, c) => ({
    ...p,
    ...c
  }));
  return {
    ...o,
    ...stringifySymbols()
  };
};

/**
 * Convert keys from strings to symbols when
 * the object is deserialized.
 * @param {{key: string, value: Symbol}} keyMap
 */
exports.fromSymbol = fromSymbol;
const toSymbol = keyMap => o => {
  function parseSymbols() {
    return Object.keys(keyMap).map(k => o[k] ? {
      [keyMap[k]]: o[k]
    } : {}).reduce((p, c) => ({
      ...p,
      ...c
    }));
  }
  return {
    ...o,
    ...parseSymbols()
  };
};

/**
 * Convert timestamp number to formatted date string.
 * @param {number[]} timestamps
 * @param {"utc"|"iso"} format
 */
exports.toSymbol = toSymbol;
const fromTimestamp = (timestamps, format = 'utc') => o => {
  const formats = {
    utc: 'toISOString',
    iso: 'toISOString'
  };
  const fn = formats[format];
  if (!fn) {
    throw new Error('invalid date format');
  }
  const stringifyTimestamps = () => timestamps.map(k => o[k] ? {
    [k]: new Date(o[k])[fn]()
  } : {}).reduce((p, c) => ({
    ...c,
    ...p
  }));
  return {
    ...o,
    ...stringifyTimestamps()
  };
};

/**
 * Adds `toJSON` method that pipes multiple serializing mixins together.
 * @param {...functionalMixin} keyMap
 */
exports.fromTimestamp = fromTimestamp;
const withSerializers = (...funcs) => o => {
  return {
    ...o,
    toJSON() {
      return (0, _pipe.default)(...funcs)(this);
    }
  };
};

/**
 * Pipes multiple deserializing mixins together.
 * @param  {...functionalMixin} funcs
 */
exports.withSerializers = withSerializers;
const withDeserializers = (...funcs) => o => {
  function fromJSON() {
    return (0, _pipe.default)(...funcs)(o);
  }
  return {
    ...o,
    ...fromJSON()
  };
};

/**
 * Subscribe to and emit application and domain events.
 * @param {import('./event-broker').EventBroker} broker
 */
exports.withDeserializers = withDeserializers;
const withbroker = broker => o => {
  return {
    ...o,
    emit(eventName, eventData) {
      broker.notify(eventName, eventData);
    },
    subscribe(eventName, callback) {
      broker.on(eventName, callback);
    }
  };
};
exports.withbroker = withbroker;
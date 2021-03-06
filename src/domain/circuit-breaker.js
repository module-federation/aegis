"use strict";

/**
 * State of the breaker.
 * @enum {symbol}
 */
const State = {
  /** Breaker tripped. Error threshold breached. Client call suppressed. */
  Open: Symbol(),
  /** Closed circuit. Normal operation. Client call allowed. */
  Closed: Symbol(),
  /** Test circuit. Let next transation through. Close if it fails. */
  HalfOpen: Symbol(),
};

/**
 * @type {import("./index").circuitBreaker[x]}
 */
const DefaultThreshold = {
  /** Percentage of requests that failed within `intervalMs`. */
  errorRate: 20,
  /** Total number of requests within `intervalMs` */
  callVolume: 10,
  /** Milliseconds in which to measure threshold*/
  intervalMs: 10000,
  /** Milliseconds to wait after tripping breaker before retesting */
  retryDelay: 30000,
};

/**
 * Circuit history
 * @todo handle all state same way
 * @type {Map<string, {state:State,time:number,error:Error|null}[]}
 */
const logs = new Map();

/**
 *
 * @param {*} id
 * @returns
 */
function fetchLog(id) {
  if (logs.has(id)) {
    return logs.get(id);
  }
  return logs.set(id, []).get(id);
}

/**
 * Get last known status of breaker
 * @returns {symbold} breaker state
 * @returns {State}
 */
function getState(log) {
  if (log.length > 0) {
    return log[log.length - 1].state;
  }
  return State.Closed;
}

/**
 * @typedef {{
 *  [x:string]: {
 *    errorRate:number
 *    callVolume:number,
 *    intervalMs:number,
 *    fallbackFn:function()
 *  },
 * }} thresholds threshold iteria
 */

/**
 * Get threahold based on error
 * @param {Error} error,
 * @param {thresholds} thresholds
 * @returns {thresholds[x]}
 */
function getThreshold(error, thresholds) {
  const specific = error && error.name ? thresholds[error.name] : null;
  return specific || thresholds.default || DefaultThreshold;
}

/**
 * Check if any threshold for this circuit (function) is exceeded
 * @param {*} log
 * @param {*} error
 * @param {thresholds} thresholds
 * @returns {boolean} has it been breached?
 */
function thresholdBreached(log, error, thresholds) {
  if (log.length < 1) return false;
  const threshold = getThreshold(error, thresholds);
  const entriesInScope = log.filter(
    entry => entry.time > Date.now() - threshold.intervalMs
  );
  const errors = entriesInScope.filter(e => e.error);
  const callVolume = entriesInScope.length - errors.length;
  const errorRate = (errors.length / callVolume) * 100;
  return callVolume > threshold.callVolume && errorRate > threshold.errorRate;
}

/**
 * Record the error and trip the breaker if necessary.
 * @param {*} log
 * @param {*} error
 * @param {*} options
 * @returns
 */
function setStateOnError(log, error, options) {
  const state = getState(log);
  if (
    state === State.HalfOpen ||
    (state === State.Closed && thresholdBreached(log, error, options))
  ) {
    return State.Open;
  }
  return state;
}

/**
 * log error and set new state if needed.
 * @param {string} id name of protected function
 * @param {string} error
 */
export function logError(id, error, thresholds) {
  const log = fetchLog(id);
  const state = setStateOnError(log, error, thresholds);
  const testDelay = getThreshold(error, thresholds).retryDelay;
  log.push({ name: id, time: Date.now(), state, error, testDelay });
}

/**
 * Has the wait period elapsed?
 * @param {*} id
 * @returns {boolean}
 */
function readyToTest(log) {
  if (log.length < 1) return true;
  const lastEntry = log[log.length - 1];
  return Date.now() - lastEntry.time > lastEntry.testDelay;
}

/**
 * The breaker switch.
 * @param {string} id - id of the circuit
 * @param {thresholds} thresholds
 */
const Switch = function (id, thresholds) {
  const log = fetchLog(id);

  return {
    /** @type {State}  current state of the braker */
    state: getState(log),
    /**
     * Breaker closed. Normal function. Requests allowed.
     * @returns {boolean}
     */
    closed() {
      return this.state === State.Closed;
    },
    /**
     * Breaker open. Error threshold breached. Requests suppressed.
     * @returns {boolean}
     */
    open() {
      return this.state === State.Open;
    },
    /**
     * Ready to test breaker.
     * @returns {boolean}
     */
    halfOpen() {
      return this.state === State.HalfOpen;
    },
    /**
     * Trip the breaker. Open switch.
     */
    trip() {
      this.state = State.Open;
    },
    /**
     * Reset the breaker. Close switch.
     */
    reset() {
      this.state = State.Closed;
    },
    /**
     * Test the breaker. Open switch half way. Let next transation thru.
     * If it fails, close it immediately without checking threshold.
     */
    test() {
      this.state = State.HalfOpen;
    },
    /**
     * Check error-specific threshold.
     * If none found, use default threshold
     * @param {Error} error
     * @returns {boolean}
     */
    thresholdBreached(error) {
      return thresholdBreached(log, error, thresholds);
    },
    /**
     * Check if its time to test the circuit, i.e. retry.
     * @returns {boolean}
     */
    readyToTest() {
      return readyToTest(log);
    },
    /**
     * Update log with current state and error details if error.
     * @param {*} error
     */
    appendLog(error = null) {
      log.push({
        name: id,
        time: Date.now(),
        state: this.state,
        testDelay: getThreshold(error, thresholds).retryDelay,
        error,
      });
    },
  };
};

/**
 * @typedef breaker
 * @property {function(...any)} invoke call protected function with args
 * @property {function(string)} errorListener update circuit breaker on error
 */

/**
 * Decorate client library functions with a circuit breaker. When the
 * function throws an exception, we check a threshold based on the error,
 * volume of requests and the rate of failure over a given interval. If a
 * threshold is breached, the breaker trips (opens) and prevents the client
 * function from being executed. It remains open until a test interval has
 * elapsed, at which point it is switched to half-open. If the next
 * transaction succeeds, it resets (closes) ands transactions can proceed
 * as normal. If it fails, the breaker trips again.
 *
 * @class
 * @param {string} id function name or other unique name
 * @param {function()} protectedCall client function to protect
 * @param {{
 *  [x:string]: {
 *    errorRate:number
 *    callVolume:number,
 *    intervalMs:number,
 *    fallbackFn:function()
 *  },
 * }} thresholds thresholds for different errors
 * @returns {breaker}
 */
const CircuitBreaker = function (id, protectedCall, thresholds) {
  const errorEvents = [];

  return {
    // wrap client call
    async invoke(...args) {
      const breaker = Switch(id, thresholds);
      breaker.appendLog();

      const countError = function (eventName) {
        if (typeof this["addListener"] !== "function") return;
        this.addListener(eventName, eventData =>
          logError(id, eventData.eventName, thresholds)
        );
      }.bind(this);

      errorEvents.forEach(countError);

      // check breaker status
      if (breaker.closed()) {
        try {
          return await protectedCall.apply(this, args);
        } catch (error) {
          breaker.appendLog(error);

          if (breaker.thresholdBreached(error)) {
            breaker.trip();
          }
          return this;
        }
      }

      if (breaker.open()) {
        if (breaker.readyToTest()) {
          breaker.test();
        } else {
          console.warn("circuit open, call aborted", protectedCall.name);
          breaker.fallbackFn(id);
          return this;
        }
      }

      if (breaker.halfOpen()) {
        try {
          const result = await protectedCall.apply(this, args);
          breaker.reset();
          return result;
        } catch (error) {
          breaker.trip();
          breaker.appendLog(error);
        }
      }
    },

    /**
     * Listen for events that count as errors against a threashold.
     *
     * @param {Error} event
     */
    errorListener(eventName) {
      errorEvents.push(eventName);
    },
  };
};

export default CircuitBreaker;

'use strict'

import EventEmitter from 'events'

/**
 * State of the breaker.
 * @enum {symbol}
 */
const State = {
  /** Breaker tripped. Error threshold breached. Client call suppressed. */
  Open: Symbol('Open'),
  /** Closed circuit. Normal operation. Client call allowed. */
  Closed: Symbol('Closed'),
  /** Test circuit. Let next transation through. Close if it fails. */
  HalfOpen: Symbol('HalfOpen')
}

/**
 * @type {import("./index").circuitBreaker[x]}
 */
const DefaultThreshold = {
  /** Percentage of requests that failed within `intervalMs`. */
  errorRate: process.env.CIRCUITBREAKER_ERRORRATE || 20,
  /** Total number of requests within `intervalMs` */
  callVolume: process.env.CIRCUITBREAKER_CALLVOLUME || 5,
  /** Milliseconds in which to measure threshold*/
  intervalMs: process.env.CIRCUITBREAKER_INTERVALMS || 9000,
  /** Milliseconds to wait after tripping breaker before retesting */
  retryDelay: process.env.CIRCUITBREAKER_RETRYDELAY || 10000,
  /** alternative function to execute in place of failed function */
  fallbackFn: args => console.warn('default circuitbreaker fallback', args)
}

/**
 * Circuit history
 * @todo handle all state same way
 * @type {Map<string, {state:State,time:number,error:Error|null}[]}
 */
const logs = new Map()

/** @type {{[x: string]: number[]}} */
let counters = {}

/**
 *
 * @param {*} id
 * @returns
 */
function fetchLog (id) {
  if (logs.has(id)) {
    return logs.get(id)
  }
  return logs.set(id, []).get(id)
}

/**
 * Get last known status of breaker
 * @returns {symbol} breaker state
 * @returns {State}
 */
function getState (log) {
  if (log.length > 0) {
    return log[log.length - 1].state
  }
  return State.Closed
}

/**
 * @typedef {{
 *  [x:string]: {
 *    errorRate:number
 *    callVolume:number,
 *    intervalMs:number,
 *    fallbackFn:function()
 *  },
 * }} thresholds threshold citeria
 */

/**
 * Get threshold based on error
 * @param {Error} error,
 * @param {thresholds} thresholds
 * @returns {thresholds[x]}
 */
function getThreshold (error, thresholds) {
  const defaults = (thresholds && thresholds.default) || DefaultThreshold
  const specific = error?.name && thresholds && thresholds[error.name]
  return specific || defaults
}

/**
 * Check if any threshold for this circuit (function) is exceeded
 * @param {*} log
 * @param {*} error
 * @param {thresholds} thresholds
 * @returns {boolean} has it been breached?
 */
function wasThresholdBreached (log, error, thresholds) {
  console.log({ fn: wasThresholdBreached.name, error, thresholds })

  if (log.length < 1) {
    console.log('no log')
    return false
  }

  const threshold = getThreshold(error, thresholds)
  const entriesInScope = log.filter(
    entry => entry.time > Date.now() - threshold.intervalMs
  )
  const errors = entriesInScope.filter(e => e.error)
  if (errors.length > 0 && error === 'breakerTest') {
    // half open breaker trips after 1 error
    return true
  }
  const callVolume = entriesInScope.length
  const errorRate = (errors.length / callVolume) * 100
  const breach =
    callVolume > threshold.callVolume && errorRate > threshold.errorRate

  console.debug({
    debug: 'threshold values',
    error: error?.name,
    errmsg: error?.message,
    errorRate,
    callVolume,
    threshold,
    breach
  })

  return breach
}

/**
 * Record the error and trip the breaker if necessary.
 * @param {*} log
 * @param {*} error
 * @param {*} options
 * @returns
 */
function setStateOnError (log, error, options) {
  const state = getState(log)
  if (
    state === State.HalfOpen ||
    (state === State.Closed && wasThresholdBreached(log, error, options))
  ) {
    return State.Open
  }
  return state
}

/**
 * log error and set new state if needed.
 * @param {string} id name of protected function
 * @param {string} error
 */
export function logError (id, error, thresholds) {
  const log = fetchLog(id)
  const state = setStateOnError(log, error, thresholds)
  const testDelay = getThreshold(error, thresholds).retryDelay
  log.push({ name: id, time: Date.now(), state, error, testDelay })
}

/**
 * Has the wait period elapsed?
 * @param {*} id
 * @returns {boolean}
 */
function readyToTest (log) {
  console.debug('testing circuit')
  if (log.length < 1) return true
  const lastEntry = log[log.length - 1]
  return Date.now() - lastEntry.time > lastEntry.testDelay
}

/**
 * The breaker switch.
 * @param {string} id - id of the circuit
 * @param {thresholds} thresholds
 */
const Switch = function (id, thresholds) {
  const log = fetchLog(id)

  return {
    /** @type {State}  current state of the braker */
    state: getState(log),
    /**
     * Breaker closed. Normal function. Requests allowed.
     * @returns {boolean}
     */
    closed () {
      return this.state === State.Closed
    },
    /**
     * Breaker open. Error threshold breached. Requests suppressed.
     * @returns {boolean}
     */
    open () {
      return this.state === State.Open
    },
    /**
     * Ready to test breaker.
     * @returns {boolean}
     */
    halfOpen () {
      return this.state === State.HalfOpen
    },
    /**
     * Trip the breaker. Open switch.
     */
    trip (error = null) {
      this.state = State.Open
      this.appendLog(error)
    },
    /**
     * Reset the breaker. Close switch.
     */
    reset () {
      this.state = State.Closed
      this.appendLog()
    },
    /**
     * Test the breaker. Open switch half way. Let next transation thru.
     * If it fails, close it immediately without checking threshold.
     */
    test () {
      this.state = State.HalfOpen
      this.appendLog()
    },
    /**
     * Check error-specific threshold.
     * If none found, use default threshold
     * @param {Error} errorx
     * @returns {boolean}
     */
    wasThresholdBreached (error) {
      return wasThresholdBreached(log, error, thresholds)
    },
    /**
     * Check if its time to test the circuit, i.e. retry.
     * @returns {boolean}
     */
    readyToTest () {
      return readyToTest(log)
    },
    /**
     * Update log with current state and error details if error.
     * @param {*} error
     */
    appendLog (error = null) {
      log.push({
        name: id,
        time: Date.now(),
        state: this.state,
        testDelay: getThreshold(error, thresholds).retryDelay,
        error
      })
    },

    incrementInvocationCounter () {
      if (!counters[id]) counters[id] = [Date.Now()]
      else counters[id].push(Date.now())
      counters[id].filter(time => time > Date.now() - 5000).length > 999
    },

    async fallbackFn (error, arg) {
      try {
        return getThreshold(error, thresholds).fallbackFn.apply(this, arg)
      } catch (e) {
        console.log('problem calling fallback', e)
      }
      return this
    }
  }
}

/**
 * @typedef breaker
 * @property {function(...any)} invoke call protected function with args
 * @property {function(Error)} handleError record an error
 * @property {function(string)} detectErrors listen for error events and
 * update circuit breaker
 */

/**
 * Decorate client functions with a circuit breaker. When the function
 * throws an exception, we check a threshold based on the error, volume
 * of requests and the rate of failure over a given interval. If a
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
  const errorEvents = []

  const monitorErrors = function (eventName) {
    this.addListener &&
      this.addListener(eventName, () => this.handleError(eventName), {
        singleton: true
      })
  }

  return {
    // wrap client call
    async invoke (...args) {
      const breaker = Switch(id, thresholds)
      errorEvents.forEach(monitorErrors.bind(this))
      breaker.appendLog()

      // check breaker status
      if (breaker.closed()) {
        try {
          // all is well, call the function
          return await protectedCall.apply(this, args)
        } catch (error) {
          breaker.appendLog(error)
          if (breaker.wasThresholdBreached(error)) {
            breaker.trip()
            return breaker.fallbackFn.apply(this, error, args)
          }
          return this
        }
      }

      if (breaker.open()) {
        console.warn('circuit open', id)
        if (breaker.readyToTest()) {
          console.warn('testing circuit', id)
          breaker.test()
        } else {
          // try fallback
          return breaker.fallbackFn.apply(this, null, args)
        }
      }

      if (breaker.halfOpen()) {
        try {
          const result = await protectedCall.apply(this, args)
          if (breaker.wasThresholdBreached('breakerTest')) {
            console.warn('breaker test failed', id)
            breaker.trip()
          } else {
            console.info('resetting breaker', id)
            breaker.reset()
          }
          return result
        } catch (error) {
          breaker.trip(error)
          return breaker.fallbackFn.apply(this, error, args)
        }
      }

      console.warn('aborting call', id)
    },

    handleError (msg) {
      logError(id, msg, thresholds)
    },

    /**
     * Listen for events that count as errors against a threashold.
     * Provide an {@link EventEmitter} in the second param if needed.
     *
     * @param {string|string[]} eventNames
     * @param {EventEmitter} [emitter]
     */
    detectErrors (eventNames, emitter = null) {
      const errorList = [eventNames].flat()
      errorEvents.concat(errorList)

      // if we aren't being added by a domain model, which is already a
      // subclass of EventEmitter, then allow caller to provide one.
      if (emitter instanceof EventEmitter) {
        errorList.forEach(error =>
          emitter.on(error, () => logError(id, error, thresholds))
        )
      }
    }
  }
}

export const getErrorLogs = () => logs

export default CircuitBreaker

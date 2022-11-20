'use strict'

/** @typedef {import('./model-factory').ModelFactory} ModelFactory */
/** @typedef {import('.').ModelSpecification} ModelSpecification */

import portHandler from './port-handler'
import async from './util/async-error'
import CircuitBreaker from './circuit-breaker'
import domainEvents from './domain-events'

const { portRetryFailed, portRetryWorked, portTimeout } = domainEvents
const TIMEOUTSECONDS = 10
const MAXRETRY = 5

function getTimerArgs (args = null) {
  const timerArg = { calledByTimer: new Date().toUTCString() }
  if (args) return [...args, timerArg]
  return [timerArg]
}

/**
 *
 * @param {*} args
 * @returns
 */
function getRetries (args = null) {
  const timerArgs = getTimerArgs(args)
  const retries = timerArgs.filter(arg => arg.calledByTimer)
  return {
    count: retries.length,
    nextArg: timerArgs
  }
}

/**
 * Call ourselves recursively each time the adapter times out.
 * Count the number of retries by passing a counter to ourselves
 * on the stack. Better than a counter: make it a log w/ timestamps.
 *
 * @param {{
 *  portName: string,
 *  portConf: import('.').ports,
 * }} options
 */
function setPortTimeout (options) {
  const { portConf, portName, model, args } = options
  const noTimer = portConf.timeout === 0

  if (noTimer) {
    return {
      expired: () => false,
      stopTimer: () => void 0
    }
  }

  const handler = portConf.timeoutCallback
  const timeout = (portConf.timeout || TIMEOUTSECONDS) * 1000
  const maxRetry = portConf.maxRetry || MAXRETRY
  const timerArgs = getRetries(args)
  const expired = () => timerArgs.count > maxRetry

  // Retry the port on timeout
  const timerId = setTimeout(async () => {
    // Notify interested parties
    model.emit(portTimeout(model.getName(), portName), timerArgs)
    // Invoke optional custom handler
    if (handler) handler(options)
    // Count retries by passing `timerArgs` to ourselves on the stack
    await async(model[portName](...timerArgs.nextArg))
  }, timeout)

  return {
    expired,
    stopTimer: () => {
      clearTimeout(timerId)
      if (timerArgs.count > 1) {
        model.emit(portRetryWorked(model.getName(), portName), options)
      }
    }
  }
}

/**
 * @param {function({model:Model,port:string},{*})} cb
 */
function getPortCallback (cb) {
  if (typeof cb === 'function') {
    return cb
  }
  return portHandler
}

/**
 * Are we compensating for a canceled transaction?
 * @param {import(".").Model} model
 */
function isUndoRunning (model) {
  return model.findSync(model.getId()).compensate
}

function hydrate (broker, datasource, eventInfo) {
  const model = eventInfo.model
  const modelName = eventInfo.model.modelName
  if (!modelName) return eventInfo.model
  return require('.').default.loadModel(broker, datasource, model, modelName)
}

/**
 * Register an event handler to invoke this `port`.
 * @param {string} portName
 * @param {import('.').ports[portName]} portConf
 * @param {import("./event-broker").EventBroker} broker
 * @param {boolean} disabled
 * @returns {boolean} whether or not to remember this port
 * for compensation and restart
 */
function addPortListener (portName, portConf, broker, datasource) {
  if (portConf.consumesEvent) {
    const callback = getPortCallback(portConf.callback)

    // listen for triggering event
    broker.on(
      portConf.consumesEvent,
      async function (eventInfo) {
        const model = hydrate(broker, datasource, eventInfo)

        if (isUndoRunning(model)) {
          console.log('undo running, canceling port operation')
          return
        }

        console.log(
          `event ${eventInfo.eventName} fired: calling port ${portName}`,
          eventInfo
        )
        // invoke this port
        await async(model[portName](callback))
      },
      { singleton: true }
    )

    return true
  }
  return false
}

/**
 * Push new port on stack and update model, immutably.
 * @param {import(".").Model} model
 * @param {*} port
 * @param {*} remember
 * @returns {Promise<import(".").Model>}
 */
async function updatePortFlow (model, port) {
  const updateModel = this.equals(model) ? model : this
  return updateModel.update(
    {
      [updateModel.getKey('portFlow')]: [...updateModel.getPortFlow(), port]
    },
    false
  )
}

/**
 * Generate functions to handle I/O between the domain
 * and application layers. Each port is assigned an adapter,
 * which either invokes the port (inbound) or is invoked by
 * it (outbound).
 *
 * Ports can be instrumented for exceptions and timeouts. They
 * can also be piped together in control flows by specifying
 * the output event of one port as the input or triggering event
 * of another.
 *
 * See the {@link ModelSpecification} for port configuration options.
 * @typedef {function(import('./index').ports, object[], import('./event-broker').EventBroker):()=>Promise<import('./model').Model>} makePorts
 * @param {import('./index').ports} ports - object containing domain interfaces
 * @param {object} adapters - dependencies object containing adapters and ports
 * @param {import('./event-broker').EventBroker} broker
 */
export default function makePorts (ports, adapters, broker, datasource) {
  if (!ports || !adapters) {
    return
  }

  return Object.keys(ports)
    .map(function (port) {
      const portName = port
      const portConf = ports[port]
      const disabled = portConf.disabled || !adapters[port]

      // Listen for event that will invoke this port
      const rememberPort = addPortListener(
        portName,
        portConf,
        broker,
        datasource
      )

      /**
       *
       * @param  {...any} args
       * @returns
       */
      async function portFn (...args) {
        // Don't run if port is disabled
        if (disabled) {
          return this
        }

        // Handle port timeouts
        const timer = setPortTimeout({
          portName,
          portConf,
          model: this,
          args
        })

        if (timer.expired()) {
          // This means we hit max retries
          console.warn('max retries reached', port)
          // fire event for circuit breaker / instrumentation
          this.emit(portRetryFailed(this.getName(), port))
          // Try to back out
          return this.undo()
        }

        try {
          // call the inbound or oubound adapte
          const result = await adapters[port]({ model: this, port, args })

          // Stop the timer
          timer.stopTimer()

          // Remember what ports we called in case of restart or undo
          const model = rememberPort
            ? (await updatePortFlow.call(this, result, port)) || this
            : this

          // Signal the next port to run.
          if (rememberPort) {
            console.log({ producerEvent: portConf.producesEvent })
            model.emit(portConf.producesEvent, portName)
          }

          // the result can be something other than the model
          return model.equals(result) ? model : result
        } catch (error) {
          console.error({ func: port, args, error })

          // Timer still running?
          if (timer.expired()) {
            // Try to back out.
            return this.undo()
          }

          throw error
        }
      }

      return {
        // The port function
        async [port] (...args) {
          // check if the port defines breaker thresholds
          const thresholds = portConf.circuitBreaker

          if (!thresholds) return portFn.apply(this, args)
          /**
           * the circuit breaker instance
           * @type {import('./circuit-breaker').breaker}
           */
          const breaker = CircuitBreaker(port, portFn, thresholds)

          // Listen for errors
          breaker.detectErrors([
            portRetryFailed(this.getName(), port),
            portTimeout(this.getName(), port)
          ])

          // invoke port with circuit breaker failsafe
          return breaker.invoke.apply(this, args)
        }
      }
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

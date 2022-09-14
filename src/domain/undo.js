import CircuitBreaker from './circuit-breaker'
import domainEvents from './domain-events'

const { undoStarted, undoWorked, undoFailed } = domainEvents

const MAXRETRY = process.env.MAXUNDORETRY || 3
const UNDOTIMEOUT = process.env.UNDOTIMEOUT || 60000

function reportStatus (status, eventFn, model) {
  const result = { compensateResult: status }
  model.emit(eventFn(model.getName()), result)
  return model.update(result)
}

/**
 * Steps through the sequence of port calls
 * in LIFO order executing their undo functions.
 *
 * Will retry undo functions up to MAXRETRY times
 * or per port.retries in spec.
 *
 * @param {import('.').Model} model
 * @returns {function():Promise<void>}
 */
export default async function compensate (model) {
  try {
    const portFlow = model.getPortFlow()
    const ports = model.getPorts()
    let undoAttempts = portFlow
      .map(port => ({ [port]: 0 }))
      .reduce((a, b) => ({ ...a, ...b }), {})

    model.emit(undoStarted(model.getName()), 'undo starting')

    const undoModel = await Promise.resolve(
      portFlow.reduceRight(async function (model, port, index, arr) {
        if (ports[port].undo) {
          undoAttempts[port]++

          try {
            return model.then(async function (model) {
              const breaker = CircuitBreaker(
                port, // undo failure counts against total errors for the port
                ports[port].undo,
                ports[port].circuitBreaker
              )

              const timerId = setTimeout(
                () => breaker.error('undoTimeout'),
                UNDOTIMEOUT
              )

              await breaker.invoke(model)
              clearTimeout(timerId)

              // success: remove from list
              return model.update({
                [model.getKey('portFlow')]: arr.splice(0, index + 1)
              })
            })
          } catch (error) {
            console.error(compensate.name, error.message)

            const retryLimit = ports[port].retries || MAXRETRY
            if (undoAttempts[port] > retryLimit)
              throw new Error('max undo retries', error.message)
          }
        }
        return Promise.resolve(model)
      }, model.update({ compensate: true }))
    )

    if (undoModel.getPortFlow().length > 0) {
      reportStatus('INCOMPLETE', undoFailed, undoModel)
      return
    }

    reportStatus('COMPLETE', undoWorked, undoModel)
    return undoModel
  } catch (error) {
    model.emit(undoFailed(model.getName()), error.message)
    console.error(compensate.name, error.message)
  }
}

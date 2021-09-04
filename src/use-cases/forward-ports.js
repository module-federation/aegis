'use strict'

function getNonLocalEvents (specs) {
  const cons = [...specs]
    .map(([k, v]) =>
      [...v].map(([k2, v2]) =>
        Object.values(v2.ports)
          .filter(p => p.internal)
          .map(p => p.consumesEvent)
      )
    )
    .flat(3)

  const pros = [...specs]
    .map(([k, v]) =>
      [...v].map(([k2, v2]) =>
        Object.values(v2.ports)
          .filter(p => p.internal)
          .map(p => p.producesEvent)
      )
    )
    .flat(3)

  return {
    consumers: cons.filter(c => !pros.includes(c)),
    producers: pros.filter(p => !cons.includes(p))
  }
}

/**
 * Subscribe to remote consumer port events
 * and publish local producer port events,
 * provided they are marked as `internal`,
 * meaning there is no third party integration
 * or local service handling the port. Interal
 * ports use the built-in mesh network.
 *
 * This enables event-driven worklfow to function
 * whether participating components are local or
 * remote, i.e. it enables transparent integration.
 *
 * Note the system will try to determine if there is
 * a local service to handle the event before subscribing
 * or forwarding.
 *
 * @param {import("../domain/observer").Observer} observer
 * @param {import("../domain/model-factory").ModelFactory} models
 * @param {function(event,data)} publish
 * @param {function(event,function())} subscribe
 */
export function handlePortEvents ({ observer, models, publish, subscribe }) {
  /**@type{import('../domain/').ModelSpecification[]} */
  const specs = models.getModelSpecs()

  const { consumers, producers } = getNonLocalEvents(specs)

  consumers.forEach(consumer =>
    subscribe(consumer, eventData =>
      observer.notify(eventData.eventName, eventData)
    )
  )

  producers.forEach(producer =>
    observer.on(producer, eventData => publish(eventData.eventName, eventData))
  )
}

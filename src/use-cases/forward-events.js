'use strict'

function getLocallyUnhandledEvents (specs) {
  console.debug(specs)
  const cons = specs
    .filter(spec => spec.ports)
    .map(spec => Object.entries(spec.ports))
    .filter(([port]) => !port.internal)
    .map(([port]) => port.consumesEvent)

  const pros = specs
    .filter(spec => spec.ports)
    .map(spec => Object.entries(spec.ports))
    .filter(([port]) => !port.internal)
    .map(([port]) => port.producesEvent)

  console.debug(cons, pros)

  return {
    consumerEvents: cons.filter(c => !pros.includes(c)),
    producerEvents: pros.filter(p => !cons.includes(p))
  }
}

/**
 * The idea is to forward local port events to
 * remote instances, in the event they are
 * participants in a distributed workflow.
 *
 * This enables transparent integration of local and
 * remote ports. When local, ports send events through the
 * in-memory event broker. When remote, we forward
 * local events from the broker to remote instances
 * over the service mesh or event bus.
 *
 * Subscribe to remote consumer events and publish local
 * producer events, provided there is no local service
 * configured to handle the event.
 *
 * @param {import("../domain/observer").Observer} observer
 * @param {import("../domain/model-factory").ModelFactory} models
 * @param {function(event,data)} publish
 * @param {function(event,function())} subscribe
 */
export function forwardPortEvents ({ observer, models, publish, subscribe }) {
  /**@type{import('../domain').ModelSpecification[]} */
  const specs = models.getModelSpecs()

  const { consumerEvents, producerEvents } = getLocallyUnhandledEvents(specs)

  consumerEvents.forEach(consumerEvent =>
    subscribe(consumerEvent, eventData =>
      observer.notify(eventData.eventName, eventData)
    )
  )

  producerEvents.forEach(producerEvent =>
    observer.on(producerEvent, eventData =>
      publish(eventData.eventName, eventData)
    )
  )
}

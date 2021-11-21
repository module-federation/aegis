'use strict'

import domainEvents from '../domain/domain-events'

function listUnhandledPortEvents (specs) {
  const cons = specs
    .filter(spec => spec.ports)
    .map(spec =>
      Object.values(spec.ports)
        .filter(v => v.consumesEvent && v.forward)
        .map(v => v.consumesEvent)
    )
    .flat(2)

  const pros = specs
    .filter(spec => spec.ports)
    .map(spec =>
      Object.values(spec.ports)
        .filter(v => v.producesEvent && v.forward)
        .map(v => v.producesEvent)
    )
    .flat(2)

  return {
    consumerEvents: cons.filter(c => !pros.includes(c)),
    producerEvents: pros.filter(p => !cons.includes(p))
  }
}

/**
 * Forward any releveant internal events to the external event bus
 * or service mesh.
 *
 * @param {import("../domain/observer").Observer} observer
 * @param {import("../domain/model-factory").ModelFactory} models
 * @param {function(event,data)} publish
 * @param {function(event,function())} subscribe
 */
export function forwardEvents ({ observer, models, publish, subscribe }) {
  /**@type{import('../domain').ModelSpecification[]} */
  const specs = models.getModelSpecs()

  /**
   * The idea is to forward local port events to
   * remote instances, in the event the ports are
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
   */
  function forwardPortEvents () {
    const { consumerEvents, producerEvents } = listUnhandledPortEvents(specs)

    console.info(
      'listen for unhandled consumer events\n',
      consumerEvents,
      '\nforward unhandled producer events\n',
      producerEvents
    )

    consumerEvents.forEach(consumerEvent =>
      subscribe(consumerEvent, eventData =>
        observer.notify(consumerEvent, `eventData` || 'no data')
      )
    )

    producerEvents.forEach(producerEvent =>
      observer.on(producerEvent, eventData => publish(eventData), {
        allowMultiple: false
      })
    )
  }
  ;``

  /**
   * Forward events so marked.
   */
  function forwardUserEvents () {
    observer.on('publishWasm', data =>
      publish({ ...data, eventName: data.eventName })
    )

    subscribe('publishWasm', data => observer.notify(data.eventName, data))

    observer.on(domainEvents.forwardEvent(), eventData => {
      console.debug(forwardUserEvents.name, 'called')
      publish(eventData)
    })
  }

  forwardPortEvents()

  forwardUserEvents()
}

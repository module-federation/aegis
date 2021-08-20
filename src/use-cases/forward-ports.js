"use strict"

/**
 * Subscribe to external consumer port events 
 * and publish producer port events externally.
 * 
 * Event-driven worklfow will function whether
 * participating components are local or remote.
 * 
 * @param {import("../domain/observer").Observer} observer 
 * @param {import("../domain/model-factory").ModelFactory} models 
 * @param {function(event,data)} publish 
 * @param {function(event,function())} subscribe 
 */
export function externalizePortEvents(observer, models, publish, subscribe) {
  const specs = models.getModelSpecs();

  specs.forEach(spec => spec.getPorts().forEach(port => {
    const consumer = spec.getPorts[port].consumesEvent
    const producer = spec.getPorts[port].producesEvent

    if (consumer) {
      subscribe(consumer, (eventData) => observer.notify(eventData.eventName, eventData))
    }

    if (producer) {
      observer.on(producer, (eventData) => publish(eventData.eventName, eventData));
    }
  }))
}
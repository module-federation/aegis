'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forwardEvents = forwardEvents;
var _domainEvents = _interopRequireDefault(require("../domain-events"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function listUnhandledPortEvents(specs) {
  const cons = specs.filter(spec => spec.ports).map(spec => Object.values(spec.ports).filter(v => v.consumesEvent).map(v => v.consumesEvent)).flat(2);
  const pros = specs.filter(spec => spec.ports).map(spec => Object.values(spec.ports).filter(v => v.producesEvent).map(v => v.producesEvent)).flat(2);
  return {
    consumerEvents: cons.filter(c => !pros.includes(c)),
    producerEvents: pros.filter(p => !cons.includes(p))
  };
}

/**
 * Forward any releveant internal events to the external event bus
 * or service mesh.
 *
 * @param {import("../domain/event-broker").EventBroker} broker
 * @param {import("../domain/model-factory").ModelFactory} models
 * @param {function(event,data)} publish
 * @param {function(event,function())} subscribe
 */
function forwardEvents({
  broker,
  models,
  publish,
  subscribe
}) {
  /**@type{import('../domain').ModelSpecification[]} */
  const specs = models.getModelSpecs();

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
  function forwardPortEvents() {
    const {
      consumerEvents,
      producerEvents
    } = listUnhandledPortEvents(specs);
    console.info('listen for unhandled consumer events\n', consumerEvents, '\nforward unhandled producer events\n', producerEvents);
    consumerEvents.forEach(consumerEvent => subscribe(consumerEvent, eventData => broker.notify(consumerEvent, `eventData` || 'no data', {
      mesh: true
    })));
    producerEvents.forEach(producerEvent => broker.on(producerEvent, eventData => publish(eventData), {
      singleton: true
    }));
  }

  /**
   * Forward events so marked.
   */
  function forwardUserEvents() {
    broker.on('publishWasm', data => publish({
      ...data,
      eventName: data.eventName
    }));
    subscribe('publishWasm', data => broker.notify(data.eventName, data), {
      mesh: true
    });

    // broker.on(domainEvents.sendToMesh, eventData => {
    //   console.debug(forwardUserEvents.name, 'called')
    //   publish(eventData)
    // })
  }

  forwardPortEvents();
  forwardUserEvents();
}
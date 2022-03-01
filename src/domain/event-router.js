/**
 * Keep a master list in the main thread of each model's event subscriptions.
 * For the same reason, do the equivalent for mesh nodes, that is, keep track of each aegis
 * instance's subcriptions, in a master list on each webswitch.
 *
 * When a new subscription is registered, notify the router, which in turn
 * will notify the webswitch.
 *
 * When an event is emitted, the router inspects the subscribed modelName and routes it
 * to the appropriate threadpool for action. In the same way, the webswitch will route
 * events to the appropriate aegis instance or instances.
 *
 * Implement event type rules / behaviors: namely,
 * - once: run the handler only once and then unsubscribe
 * - nonce: raise an event with a universally unique name, never to be used again
 * - filter: the properties of a filter object must have matching props in the event data
 * - singleton: event to be handled by just one handler (event is handled exactly once)
 * - private: to be handled only by handler/s with shared secret hash key
 *   i.e. hash uuid and store in event data, match with hash of uuid provided by handler
 * - protected: to be handled by hanlders with specified privilidges (json token claims)
 * - local: do not forward to external instances even if the system determines the event
 *   is part of a distributed workflow
 * - metered: apply a rate limit function which when true prevents the event from being routed
 * - kpi: keep a history of these events and apply rollup functions to number of occurrences and historical values
 * - alarmed: raise a high priority or major incident when event occurs or kpi threshold is breached
 * - disabled: temporarily disable firing of event
 * - command: a structured event that includes an event target, a command to run, arguments
 *   to be provided, the expected result, a timeout value, and a response target to reply to.
 * - parallel: event incidicates some command to be run in parallel with requested number of parallel instances, model, port, args, shards
 * - chaos: generate random events for testing
 * - storm: generate event storm for testing
 * - tachyon: handle with ultra low latency "superluminal" custom ip protocol (non-Internet)
 * - infer: handle with streaming AI inference that uses one or more input streams and produces
 * a transformed output stream
 * - neural: control routing of streams to different nodes which act as neurons in neural net
 * - routed: route
 * - sequenced:
 *
 * Assign bits to all these types in a bitmap so we can easily combine types
 *
 */

/**
 *
 * @param {import('./domain-events')} events
 */
const EventRouter = function (events, subscriptions) {
  return {}
}

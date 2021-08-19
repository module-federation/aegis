import DistributedCache from "../domain/distributed-cache";
import EventBus from "../services/event-bus";
import AppMesh from "../services/mesh-node";
import uuid from "../domain/util/uuid";

const BROADCAST = process.env.TOPIC_BROADCAST || "broadcastChannel";
const useObjectCache = /true/i.test(process.env.DISTRIBUTED_CACHE_ENABLED);
const useAppMesh = /true/i.test(process.env.WEBSWITCH_ENABLED);

/** @typedef {import("../domain/datasource").default} DataSource */
/** @typedef {import('../domain/observer').Observer} Observer */

/**
 * Handle internal and external events.
 * @param {import('../domain/observer').Observer} observer
 * @param {import("../domain/datasource-factory")} datasources
 */
export default function brokerEvents(observer, datasources, models) {
  //observer.on(/.*/, async event => webswitch(event, observer));

  // Distributed object cache - must be explicitly enabled
  if (useObjectCache) {
    const meshPublish = event => AppMesh.publishEvent(event, observer);
    const meshSubscribe = (eventName, callback) => observer.on(eventName, callback);
    const busPublish = event => EventBus.notify(BROADCAST, JSON.stringify(event));
    const busSubcribe = (eventName, cb) =>
      EventBus.listen({
        topic: BROADCAST,
        id: uuid(),
        once: false,
        filters: [eventName],
        callback: (msg) => cb(JSON.parse(msg))
      });
    const publish = useAppMesh ? meshPublish : busPublish;
    const subscribe = useAppMesh ? meshSubscribe : busSubcribe;

    if (useAppMesh) {
      // connect
      publish("webswitch");
    }

    const broker = DistributedCache({
      observer,
      datasources,
      models,
      publish,
      subscribe,
    });

    broker.start();
  }

  /**
   * This is the cluster cache sync listener - when data is
   * saved in another process, the master forwards the data to
   * all the other workers, so they can update their cache.
   */
  process.on("message", ({ cmd, id, pid, data, name }) => {
    if (cmd && id && data && process.pid !== pid) {
      if (cmd === "saveCommand") {
        const ds = datasources.getDataSource(name);
        ds.save(id, data, false);
        return;
      }

      if (cmd === "deleteCommand") {
        const ds = datasources.getDataSource(name);
        ds.delete(id, false);
        return;
      }
    }
  });
}

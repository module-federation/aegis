'use strict'

import DataSource from '../../domain/datasource'

/**
 * Temporary in-memory storage.
 *
 * These methods represent calls to external storage, which doesnt
 * exist in this case. Because the system extends and overrides these
 * methods to implement caching, there's nothing for them to do, except
 * to emit cache sync events when running in cluster mode.
 */
export class DataSourceMemory extends DataSource {
  constructor(map, name, namespace, options) {
    super(map, name, namespace, options)
  }

  /**
   * @override
   *
   * Handles cluster cache sync. Sync cache of other
   * cluster members if running in cluster mode.
   *
   * @param {*} id
   * @param {*} data
   * @param {*} sync - sync cluster nodes, true by default
   * @returns
   */
  save(id, data, sync = true) {
    if (sync && process.send === 'function') {
      /** send data to cluster members */
      process.send({
        cmd: 'saveBroadcast',
        pid: process.pid,
        name: this.name,
        namespace: this.namespace,
        data,
        id,
      })
    }
  }

  /**
   * @param {*} id
   * @returns
   */
  find(id) {}

  list(options) {}

  /**
   * Handles cluster cache sync. Sync cache of other
   * cluster members if running in cluster mode.
   *
   * @override
   */
  delete(id, sync = true) {
    if (sync && process.send === 'function') {
      process.send({
        cmd: 'deleteBroadcast',
        pid: process.pid,
        name: this.name,
        namespace: this.namespace,
        id,
      })
    }
  }
}

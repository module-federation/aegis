'use strict'

import DataSource from '../../domain/datasource'

/**
 * Temporary in-memory storage.
 */
export class DataSourceMemory extends DataSource {
  constructor (map, name, namespace, options) {
    super(map, name, namespace, options)
  }

  /**
   * @override
   *
   * Update cache and datasource. Sync cache of other
   * cluster members if running in cluster mode.
   *
   * @param {*} id
   * @param {*} data
   * @param {*} sync - sync cluster nodes, true by default
   * @returns
   */
  save (id, data, sync = true) {
    if (sync && process.send === 'function') {
      /** send data to cluster members */
      process.send({
        cmd: 'saveBroadcast',
        pid: process.pid,
        name: this.name,
        data,
        id
      })
    }
  }

  /**
   * This method is meant for external storage.
   * @param {*} id
   * @returns
   */
  find (id) {
    return null
  }

  list (options) {
    return null
  }

  /**
   * @override
   */
  delete (id, sync = true) {
    if (sync && process.send === 'function') {
      process.send({
        cmd: 'deleteBroadcast',
        pid: process.pid,
        name: this.name,
        id
      })
    }
  }
}

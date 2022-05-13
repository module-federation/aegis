'use strict'

import DataSource from '../../domain/datasource'

/**
 * Temporary in-memory storage.
 */
export class DataSourceMemory extends DataSource {
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
  async save (id, data, sync = true) {
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
    return this.saveSync(id, data)
  } 
  async find (id) {
    return this.findSync(id)
  }

  /**
   * @override
   */
  findSync (id) {
    return this.dsMap.get(id)
  }

  /**
   * @override
   */
  async list (query) {
    return this.listSync(query)
  }

  /**
   * Return filtered or unfiltered list of model instances in cache.
   * @override
   * @param {{key1,keyN}} query
   * @returns
   */
  listSync (filter) {
    const values = this._listSync()
    if (values.length < 1) return []
    return this._filter(values, filter)
  }

  _listSync () {
    return [...this.dsMap.values()]
  }

  _filter (values, query) {
    if (query) {
      const count = query['count']
      if (count && !Number.isNaN(parseInt(count))) {
        return values.splice(0, count)
      }

      const keys = Object.keys(query)

      if (keys.length > 0) {
        return values.filter(v =>
          keys.every(k => (v[k] ? query[k] === v[k] : false))
        )
      }
    }
    return values
  }

  /**
   * @override
   */
  async delete (id, sync = true) {
    if (sync && process.send === 'function') {
      process.send({
        cmd: 'deleteBroadcast',
        pid: process.pid,
        name: this.name,
        id
      })
    }
    this.deleteSync(id)
  }

  async deleteSync (id) {
    this.dsMap.delete(id)
  }
}

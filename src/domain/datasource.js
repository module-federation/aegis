'use strict'

import { changeDataCapture } from './util/change-data-capture'

/**
 * @typedef {{
 *  'some-key': 'some-val',
 * }} SumOfType
 */

/**
 * @typedef {object} QueryType
 * @property {boolean} [__cached] list cache only
 * @property {number|SumOfType} [__count] number of object to return
 * @property {'and'|'or'|'not'} [__operand] operation to use for key-value pairs
 * @property {string|number|boolean} [key1] key-value pair 1
 * @property {string|number|boolean} [keyN] key-value pair n
 */

/**
 * Query syntax provided by the storage vendor's native API
 * @typedef {object} VendorType
 */

/**
 * @typedef {object} listOptions
 * @property {QueryType} query url query params
 * @property {VendorType} options Vendor-specific native query syntax
 * @property {import('stream').Writable} writable writable stream for output
 * @property {import('stream').Transform|import('stream').Transform[]} transform
 * transform stream before writing
 * @property {boolean} serialize seriailize input to writable
 * @property {boolean} streamRequested true if caller provided a writable stream -
 * indicates to the datasource that it should return a readable stream if supported
 */

/** change data capture */
const cdcEnabled = false // /true/i.test('CHANGE_DATA_CAPTURE')

function roughSizeOfObject(...objects) {
  let bytes = 0

  objects.forEach(object => {
    const objectList = []
    const stack = [object]
    while (stack.length) {
      const value = stack.pop()

      if (typeof value === 'boolean') {
        bytes += 4
      } else if (typeof value === 'string') {
        bytes += value.length * 2
      } else if (typeof value === 'number') {
        bytes += 8
      } else if (
        typeof value === 'object' &&
        objectList.indexOf(value) === -1
      ) {
        objectList.push(value)

        for (var i in value) {
          stack.push(value[i])
        }
      }
    }
  })

  return bytes
}

export default class DataSource {
  /**
   * Data source base class
   * @param {Map} map
   * @param {string} name
   * @param {string} namespace
   * @param {*} options
   */
  constructor(map, name, namespace, options = {}) {
    this.dsMap = map
    this.name = name
    this.namespace = namespace
    this.options = options
  }

  changeHandlers() {}

  handleChanges(id, data) {
    if (!cdcEnabled) return data

    const prev = this.findSync(id)
    if (!prev) return data

    const proxyClone = changeDataCapture({ ...prev }, this.changeHandlers())
    return Object.freeze(Object.assign(proxyClone, data))
  }

  /**
   * Upsert model instance asynchronously
   * to handle I/0 latency & concurrency.
   *
   * @param {*} id
   * @param {*} data
   */
  async save(id, data) {
    throw new Error('abstract method not implemented')
  }

  /**
   * Synchronous cache write. Don't use this
   * method to save to a remote data source;
   * use asychronous {@link save} method.
   *
   * @param {string} id
   * @param {import(".").Model} data
   * @returns
   */
  saveSync(id, data) {
    return this.mapSet(id, this.handleChanges(id, data))
  }

  /**
   * Override this method to implement a custom
   * datasource map.
   * @param {*} id
   * @param {*} data
   * @returns
   */
  mapSet(id, data) {
    return this.dsMap.set(id, data)
  }

  /**
   * Find model instance by ID
   * @param {*} id record id
   * @returns {Promise<any>} record
   */
  async find(id) {
    throw new Error('abstract method not implemented')
  }

  /**
   *
   * @param {string} id
   * @returns {import(".").Model}
   */
  findSync(id) {
    return this.mapGet(id)
  }

  mapGet(id) {
    return this.dsMap.get(id)
  }

  /**
   * list model instances
   * @param {listOptions} options
   * @returns {Promise<any[]>}
   */
  async list(options) {
    throw new Error('unimplemented abstract method')
  }

  /**
   *
   * @param {object} qsssuery
   * @returns
   */
  listSync(query) {
    if (query?.__count) return this.handleCount(query.__count)
    const list = this.generateList()
    return query ? this.filterList(query, list) : list
  }

  handleCount(count) {
    const [key = null, value = null] = count.split(':')

    if (key && value) {
      return {
        [key]: value,
        total: this.filterList({ [key]: value }, this.generateList()).length,
      }
    }

    return this.count()
  }

  count() {
    return {
      cached: this.getCacheSize(),
      bytes: this.getCacheSizeBytes(),
    }
  }

  generateList() {
    return this.mapToArray()
  }

  /**
   *
   * @returns
   */
  mapToArray() {
    return [...this.dsMap.values()]
  }

  /**
   *
   * @param {*} query
   * @returns
   */
  filterList(query, list) {
    if (query) {
      if (typeof query.__limit === 'number') {
        return list.splice(0, query.__limit)
      }

      const operands = {
        and: (keys, cb) => keys.every(cb),
        or: (keys, cb) => keys.some(cb),
      }

      const operand = query.__operand ? query.__operand.toLowerCase() : 'and'

      if (typeof operands[operand] !== 'function')
        throw new Error('invalid query')

      const keys = Object.keys(query).filter(
        key => !['__cached', '__operand'].includes(key.toLowerCase())
      )

      if (keys.length > 0) {
        const filteredList = list.filter(obj =>
          operands[operand](
            keys,
            key => obj[key] && new RegExp(query[key]).test(obj[key])
          )
        )
        return filteredList
      }
    }
    return list
  }

  /**
   *
   * @param {*} id
   * @param {boolean} sync sync cluster nodes, true by default
   */
  async delete(id, sync = true) {
    throw new Error('abstract method not implemented')
  }

  deleteSync(id) {
    return this.mapDelete(id)
  }

  mapDelete(id) {
    return this.dsMap.delete(id)
  }
  /**
   *
   * @param {*} options
   */
  async load(options) {}

  /**
   *
   */
  async count() {
    return this.countSync()
  }

  /**
   *
   * @returns
   */
  countSync() {
    return this.mapCount()
  }

  mapCount() {
    return this.dsMap.size()
  }

  /**
   *
   * @returns
   */
  getCacheSize() {
    return this.countSync()
  }

  /**
   *
   * @returns
   */
  getCacheSizeBytes() {
    return this.countSync() * roughSizeOfObject(this.listSync({ __limit: 1 }))
  }

  /**
   * called when a related model attempts to save
   */
  requestSave() {
    throw new Error('requestSave not implemented')
  }

  /**
   * called when a related model attempts to delete
   */
  requestDelete() {
    throw new Error('requestDelete not implemented')
  }

  getWritableStream() {
    throw new Error('getWritableStream not implemented')
  }

  getReadableStream() {
    throw new Error('getReadableStream not implemented')
  }

  requestWritableStream() {
    throw new Error('getWritableStream not implemented')
  }

  /**
   *
   */
  close() {}
}

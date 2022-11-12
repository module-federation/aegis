'use strict'

import { changeDataCapture } from './util/change-data-capture'

/** change data capture */
const cdcEnabled = false // /true/i.test('CHANGE_DATA_CAPTURE')

function roughSizeOfObject (...objects) {
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

const FACTORY = Symbol()

/**
 * Data source base class
 */
export default class DataSource {
  constructor (map, name, options) {
    this.className = this.constructor.name
    this.dsMap = map
    this.name = name
    this.options = options
  }

  changeHandlers () {}

  handleChanges (id, data) {
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
   * @returns {Promise<object>}
   */
  async save (id, data) {
    return this.saveSync(id, data)
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
  saveSync (id, data) {
    return this.mapSet(id, this.handleChanges(id, data))
  }

  /**
   * Override this method to implement a custom
   * datasource map.
   * @param {*} id
   * @param {*} data
   * @returns
   */
  mapSet (id, data) {
    return this.dsMap.set(id, data)
  }

  /**
   * Find model instance by ID
   * @param {*} id record id
   * @returns {Promise<any>} record
   */
  async find (id) {
    return this.findSync(id)
  }

  /**
   *
   * @param {string} id
   * @returns {import(".").Model}
   */
  findSync (id) {
    return this.mapGet(id)
  }

  mapGet (id) {
    return this.dsMap.get(id)
  }

  /**
   * list model instances
   * @param {{key1:string, keyN:string}} filter - e.g. http query
   * @param {{
   *  writable: WritableStream,
   *  cached: boolean,
   *  serialize: boolean,
   *  transform: Transform
   * }} options
   *    - details
   *    - `serialize` seriailize input to writable
   *    - `cached` list cache only
   *    - `transform` transform stream before writing
   *    - `writable` writable stream for output
   * @returns {Promise<any[]>}
   */
  async list ({ query = null } = {}) {
    return this.listSync(query)
  }

  /**
   *
   * @param {object} query
   * @returns
   */
  listSync (query = null) {
    if (query?.__count) return this.count()
    const list = this.generateList()
    return query ? this.filterList(query, list) : list
  }

  count () {
    return {
      cached: this.getCacheSize(),
      bytes: this.getCacheSizeBytes()
    }
  }

  generateList () {
    return this.mapToArray()
  }

  /**
   *
   * @returns
   */
  mapToArray () {
    return [...this.dsMap.values()]
  }

  /**
   *
   * @param {*} query
   * @returns
   */
  filterList (query, listOfObjects) {
    if (query) {
      if (
        query.__count &&
        !Number.isNaN(parseInt(query.__count)) &&
        Object.keys(query).length === 1
      ) {
        return listOfObjects.splice(0, query.__count)
      }

      const operands = {
        and: (arr, cb) => arr.every(cb),
        or: (arr, cb) => arr.some(cb)
      }

      let operand = query.__operand
      if (operand) operand = operand.toLowerCase()
      if (!operands[operand]) operand = 'and'

      const boolOp = query.__operand === 'not' ? true : false

      const keys = Object.keys(query).filter(
        key => !['__count', '__cached', '__operand'].includes(key.toLowerCase())
      )

      if (keys.length > 0) {
        const loo = listOfObjects.filter(object =>
          operands[operand](keys, key =>
            object[key] ? new RegExp(query[key]).test(object[key]) : boolOp
          )
        )

        if (query.__count)
          return {
            list: loo.length,
            total: this.getCacheSize(),
            bytes: this.getCacheSizeBytes()
          }

        return loo
      }
    }
    return listOfObjects
  }

  /**
   *
   * @param {*} id
   * @param {boolean} sync sync cluster nodes, true by default
   */
  async delete (id, sync = true) {
    return this.deleteSync(id)
  }

  deleteSync (id) {
    return this.mapDelete(id)
  }

  mapDelete (id) {
    return this.dsMap.delete(id)
  }
  /**
   *
   * @param {*} options
   */
  async load (options) {}

  /**
   *
   */
  async count () {
    return this.countSync()
  }

  /**
   *
   * @returns
   */
  countSync () {
    return this.mapCount()
  }

  mapCount () {
    return this.dsMap.size()
  }

  /**
   *
   * @returns
   */
  getCacheSize () {
    return this.countSync()
  }

  /**
   *
   * @returns
   */
  getCacheSizeBytes () {
    return this.countSync() * roughSizeOfObject(this.listSync({ __count: 1 }))
  }

  /**
   * Subclasses must override this method to run
   * the query against the datastore it accesses.
   * @param {{foreignKey:id}} filter
   */
  oneToMany (filter) {
    return this.listSync(filter)
  }

  /**
   * Subclasses must override this method to run
   * the query against the datastore it accesses.
   * @param {foreignKey} filter
   * @returns
   */
  manyToOne (filter) {
    return this.find(filter)
  }

  /**
   * Subclasses must override this method to run
   * the query against the datastore it accesses.
   * @param {{foreignKey:id}} filter
   * @returns
   */
  containsMany (filter) {
    return this.listSync(filter)
  }

  /**
   * called when a related model attempts to save
   */
  requestSave () {
    throw new Error('requestSave not implemented')
  }

  /**
   * called when a related model attempts to delete
   */
  requestDelete () {
    throw new Error('requestDelete not implemented')
  }

  getWritableStream () {
    throw new Error('getWritableStream not implemented')
  }

  getReadableStream () {
    throw new Error('getReadableStream not implemented')
  }

  requestWritableStream () {
    throw new Error('getWritableStream not implemented')
  }

  /**
   *
   */
  close () {}

  getClassName () {
    return this.className
  }
}

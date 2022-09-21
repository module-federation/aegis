'use strict'

import { Writable } from 'stream'
import { changeDataCapture } from './util/change-data-capture'

/** change data capture */
let CDC = {}
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

/**
 * Data source base class
 */
export default class DataSource {
  constructor (map, factory, name) {
    this.className = this.constructor.name
    this.dsMap = map
    this.factory = factory
    this.name = name
  }

  /**
   *
   * @param {*} id
   * @param {*} data
   * @returns
   */
  changeDataCapture (id, data) {
    const cdc = CDC[this.name] && CDC[this.name][id] ? CDC[this.name][id] : null
    const deserialized = JSON.parse(JSON.stringify(data))
    if (cdc) {
      const indeces = []
      indeces[0] = cdc.changes.length
      Object.keys(data).forEach(key => (cdc.proxy[key] = deserialized[key]))
      cdc.indeces[1] = cdc.changes.length
      cdc.metadata.push({ time: Date.now(), indeces, user: null })
      return cdc.changes.slice(cdc.indeces[0], cdc.indeces[1] - cdc.indeces[0])
    }
    let changes
    const writeEvent = { time: Date.now(), indeces: [], user: null }
    CDC[this.name] = {}
    CDC[this.name][id] = {}
    CDC[this.name][id].changes = changes = []
    writeEvent.indeces[0] = 0
    CDC[this.name][id].proxy = changeDataCapture(deserialized, changes)
    Object.keys(data).forEach(
      key => (CDC[this.name][id].proxy[key] = data[key])
    )
    writeEvent.indeces[1] = changes.length
    CDC[this.name][id].metadata = []
    CDC[this.name][id].metadata.push(writeEvent)
  }

  /**
   * Upsert model instance asynchronomously
   * to handle I/0 latency and concurrency
   * @param {*} id
   * @param {*} data
   * @returns {Promise<object>}
   */
  async save (id, data) {
    return this.saveSync(id, data)
  }

  /**
   * Synchronous cache write. Dont use
   * this method to call a remote datasource.
   * Use async {@link save} instead.
   * @param {string} id
   * @param {import(".").Model} data
   * @returns
   */
  saveSync (id, data) {
    if (cdcEnabled) this.changeDataCapture(id, data)
    return this.mapSet(id, data)
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
  async list ({ query = null, writable = null } = {}) {
    return this.listSync(query)
  }

  /**
   *
   * @param {object} query
   * @returns
   */
  listSync (query = null) {
    if (query.__status) return this.status()
    const list = this.generateList()
    return query ? this.filterList(query, list) : list
  }

  status () {
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

        if (query.__count === 'stats')
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
   * @returns {import("./datasource-factory").DataSourceFactory}
   */
  getFactory () {
    return this.factory
  }

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
    return this.countSync() * roughSizeOfObject(this.listSync({ count: 1 }))
  }

  /**
   * Called by framework to return primary key
   * @param {*} pkprop key and value of primary
   * @returns {Promise<import('.').datasource>}
   */
  async manyToOne (pkvalue) {}

  /**
   * Called by framework to return multiple records linked to primary.
   * @param {*} fkname foreign key name
   * @param {*} pkvalue primary key value
   * @returns {Promise<import('.').datasource[]>}
   */
  async oneToMany (fkname, pkvalue) {}

  /**
   *
   */
  close () {}

  getClassName () {
    return this.className
  }
}

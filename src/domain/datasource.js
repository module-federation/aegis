'use strict'

function roughSizeOfObject(...objects) {
  let bytes = 0

  objects.forEach(object => {
    const objectList = []
    const stack = [object]
    while (stack.length) {
      var value = stack.pop()

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
 * Abstract datasource class
 */
export default class DataSource {
  constructor(map, factory, name) {
    this.dsMap = map
    this.factory = factory
    this.name = name
  }

  /**
   * Upsert model instance
   * @param {*} id
   * @param {*} data
   * @returns {Promise<object>}
   */
  async save(id, data) {
    this.saveSync(id, data)
  }

  /**
   * 
   * @param {string} id 
   * @param {import(".").Model} data 
   * @returns 
   */
  saveSync(id, data) {
    return this.dsMap.set(id, data)
  }

  /**
   * Find model instance by ID
   * @param {*} id record id
   * @returns {Promise<any>} record
   */
  async find(id) {
    return this.findSync(id)
  }

  /**
   * 
   * @param {string} id 
   * @returns {import(".").Model}
   */
  findSync(id) {
    return this.dsMap.get(id)
  }

  /**
   * list model instances
   * @param {object} [query] - filter for properties of query 
   * @param {boolean} [cached] - list cached items, default is true
   * @returns {Promise<any[]>}
   */
  async list(query = null, cached = true) {
    return this.listSync(query)
  }

  /**
   * 
   * @param {object} query 
   * @returns 
   */
  listSync(query) {
    const list = this.generateList()
    return query ? this.filterList(query, list) : list
  }

  generateList() {
    return [...this.dsMap.values()]
  }

  /**
   * 
   * @param {*} query 
   * @returns 
   */
  filterList(query, list) {
    if (query) {
      const count = query['count']
      if (count && !Number.isNaN(parseInt(count))) {
        return list.splice(0, count)
      }

      const keys = Object.keys(query)

      if (keys.length > 0) {
        return list.filter(v =>
          keys.every(k => (v[k] ? query[k] === v[k] : false))
        )
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
    return this.deleteSync(id)
  }

  deleteSync(id) {
    return this.dsMap.delete(id)
  }

  /**
   *
   * @param {*} options
   */
  async load(options) { }

  /**
   *
   * @returns {import("./datasource-factory").DataSourceFactory}
   */
  getFactory() {
    return this.factory
  }

  /**
   *
   */
  count() {
    return this.dsMap.size()
  }

  /**
   * 
   * @returns 
   */
  getCacheSize() {
    return this.count()
  }

  /**
   * 
   * @returns 
   */
  getCacheSizeBytes() {
    return this.count() * roughSizeOfObject(this.listSync({ count: 1 }))
  }

  /**
   *
   */
  close() { }
}

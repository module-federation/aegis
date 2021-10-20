'use strict'

import { DataSourceMemory } from '.'

export class DataSourceServiceMesh extends DataSourceMemory {
  constructor (dataSource, factory, name) {
    super(dataSource, factory, name)
  }

  /**
   * @override
   */
  load () {}

  /**
   * @override
   * @param {*} id
   * @param {*} data
   */
  save (id, data) {}

  /**
   * @override
   * @param {*} id
   */
  find (id) {}

  /**
   * @override
   */
  list () {}
}

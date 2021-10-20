'use strict'

import mlink, { sharedObject } from 'mesh-link'
import { DataSourceMemory } from '.'

async function createShardObject (name) {
  mlink.sharedObject.create({ name, ds: { value: '' } })
}
async function fetchSharedObject (name) {
  const so = await mlink.sharedObject.get(name)
  const rv = so || (await createSharedObject(name))
  return rv
}

export class DataSourceMeshLink extends DataSourceMemory {
  constructor (dataSource, factory, name) {
    super(dataSource, factory, name)
  }

  /**
   * @override
   */
  async load ({ hydrate, serializer }) {
    this.serializer = serializer
    this.so = await fetchSharedObject(this.name)
  }

  /**
   * @override
   * @param {*} id
   * @param {*} data
   */
  async save (id, data) {
    const so = await fetchSharedObject(this.name)
  }

  /**
   * @override
   * @param {*} id
   */
  async find (id) {}

  /**
   * @override
   */
  async list () {}
}

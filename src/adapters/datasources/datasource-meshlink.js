'use strict'

import mlink, { sharedObject } from 'mesh-link'
import { DataSourceMemory } from '.'

async function createSharedObject (name) {
  mlink.sharedObject.create({ name: { value: name }, modelId: { value: null } })
}

async function fetchSharedObject (name) {
  const so = await mlink.sharedObject.get(name)
  const rv = so || (await createSharedObject(name))
  return rv
}

export class DataSourceMeshLink extends DataSourceMemory {
  constructor (dataSource, name, namespace, options = {}) {
    super(dataSource, name, namespace, options)
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

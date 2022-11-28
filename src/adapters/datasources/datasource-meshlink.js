'use strict'

import mlink, { sharedObject } from 'mesh-link'
import DataSource from '../../domain/datasource'

async function createSharedObject (name) {
  mlink.sharedObject.create({ name: { value: name }, modelId: { value: null } })
}

async function fetchSharedObject (name) {
  const so = await mlink.sharedObject.get(name)
  const rv = so || (await createSharedObject(name))
  return rv
}

export class DataSourceMeshLink extends DataSource {
  constructor (map, name, namespace, options = {}) {
    super(map, name, namespace, options)
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

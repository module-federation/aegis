'use strict'

import SharedMap, { SharedMapOptions } from 'sharedmap'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
import { EventBrokerFactory } from '.'
import Serializer from './serializer'

const MAPSIZE = 2048 * 128
// Size is in UTF-16 codepointse
const KEYSIZE = 32
const OBJSIZE = 4056

let serializer
const serialize = process.env.SERIALIZE_ENABLED || false

/**x
 * composional class mixin - so any class
 * in the hierarchy can use shared memory
 * @param {*} superclass
 * @returns
 */
const SharedMemMixin = superclass =>
  class extends superclass {
    /**
     * @override
     */
    async save (id, data) {
      return super.save(id, JSON.stringify(data))
    }

    /**
     * @override
     * @param {*} id
     * @returns
     */
    async find (id) {
      const modelString = await super.find(id)
      const model = modelString.getId ? modelString : JSON.parse(modelString)

      return isMainThread
        ? model
        : ModelFactory.loadModel(
            EventBrokerFactory.getInstance(),
            this,
            model,
            String(this.name).toUpperCase()
          )
    }

    /**
     * @override
     * @param {*} filter
     * @returns
     */
    async list (filter) {
      // do not fully hydrate by default
      const list = await super.list(filter)
      return list.map(v => v)
    }

    /**
     * @override
     * @param {*} filter
     * @returns
     */
    listSync (filter) {
      // do not fully hydrate by default
      const list = super.listSync(filter)
      return list.map(v => v)
    }

    replace (key, value) {
      return serialize && this.serializer.serialize(key, value)
    }

    revive (key, value) {
      return serialize && this.serializer.deserialize(key, value)
    }
  }

/**
 * decorator that adds support for shared memory
 * @param {function():import('./datasource').default} getDataSource
 * @param {import('./datasource-factory').DataSourceFactory} factory
 * @returns {{dataSource: SharedMap}}
 */
export function withSharedMem (getDataSource, factory, name) {
  const sharedMap = isMainThread
    ? Object.assign(new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE), {
        modelName: name
      })
    : Object.setPrototypeOf(workerData.sharedMap, SharedMap.prototype)

  console.debug({ fn: withSharedMem.name, sharedMap, workerData })

  return getDataSource.call(factory, name.toUpperCase(), {
    dsMap: sharedMap,
    mixin: DsClass => class SharedMemDs extends SharedMemMixin(DsClass) {}
  })
}

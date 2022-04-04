'use strict'

import SharedMap, { SharedMapOptions } from 'sharedmap'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
import { EventBrokerFactory } from '.'
import Serializer from './serializer'

const MAPSIZE = 2048 * 128
// Size is in UTF-16 codepointse
const KEYSIZE = 32
const OBJSIZE = 1024

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
      return super.save(id, JSON.stringify(data, this.replace))
    }

    /**
     * @override
     * @param {*} id
     * @returns
     */
    async find (id) {
      const modelString = await super.find(id)
      if (!modelString) return

      // deserialize
      const model = JSON.parse(modelString)

      console.debug({
        fn: this.find.name,
        modelName: String(model.modelName).toUpperCase()
      })

      // unmarshal
      return ModelFactory.loadModel(
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
      return list.map(v => JSON.parse(v))
    }

    /**
     * @override
     * @param {*} filter
     * @returns
     */
    listSync (filter) {
      // do not fully hydrate by default
      const list = super.listSync(filter)
      return list.map(v => JSON.parse(v))
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
    ? new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE)
    : Object.setPrototypeOf(workerData.sharedMap, SharedMap.prototype)

  console.debug({ fn: withSharedMem.name, sharedMap, workerData })

  return getDataSource.call(factory, name.toUpperCase(), {
    dsMap: sharedMap,
    mixin: DsClass => class SharedMemDs extends SharedMemMixin(DsClass) {}
  })
}

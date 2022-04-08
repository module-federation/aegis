'use strict'

import SharedMap, { SharedMapOptions } from 'sharedmap'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
import { EventBrokerFactory } from '.'

const MAPSIZE = 2048 * 128
// Size is in UTF-16 codepointse
const KEYSIZE = 32
const OBJSIZE = 4056

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
     * Deserialize
     * @override
     * @param {*} id
     * @returns
     */
    async find (id) {
      const modelString = await super.find(id)
      const model =
        typeof modelString === 'string' ? JSON.parse(modelString) : modelString

      return isMainThread
        ? model
        : ModelFactory.loadModel(
            EventBrokerFactory.getInstance(),
            this,
            model,
            String(this.name).toUpperCase()
          )
    }
  }

/**
 * Decorator adds support for thread-safe shared {@link Map} using
 * {@link SharedArrayBuffer}.
 *
 * @param {function():import('./datasource').default} getDataSource
 * @param {import('./datasource-factory').DataSourceFactory} factory
 * @returns {import('./datasource').default}
 */
export function withSharedMem (getDataSource, factory, name) {
  // thread-safe map
  const sharedMap = isMainThread
    ? Object.assign(new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE), {
        modelName: name
      })
    : Object.setPrototypeOf(workerData.sharedMap, SharedMap.prototype) // restore

  // call with shared map and mixin that extends ds class
  return getDataSource.call(factory, name.toUpperCase(), {
    dsMap: sharedMap,
    mixin: DsClass => class SharedMemDs extends SharedMemMixin(DsClass) {}
  })
}

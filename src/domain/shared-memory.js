'use strict'

import SharedMap from 'sharedmap'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
import { EventBrokerFactory } from '.'
const broker = EventBrokerFactory.getInstance()

const MAPSIZE = 2048 * 56
// Size is in UTF-16 codepointse
const KEYSIZE = 32
const OBJSIZE = 4056

/**
 * compositional class mixin - so any class
 * in the hierarchy can use shared memory
 * @param {import('./datasource').default} superclass
 * @returns {import('./datasource').default} shared memory
 * @callback
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
     * @returns {import('./datasource-factory').Model}
     */
    async find (id) {
      const modelString = await super.find(id)
      const model =
        typeof modelString === 'string' ? JSON.parse(modelString) : modelString

      if (!model) return null

      try {
        return isMainThread
          ? model
          : ModelFactory.loadModel(broker, this, model, this.name.toUpperCase())
      } catch (error) {
        console.error({ fn: 'SharedMem.find', error })
      }
      return model
    }
  }

/** @typedef {import('./datasource-factory').default} DataSourceFactory */

function getSharedMap (name) {
  const dsMap = workerData.dsRelated.find(ds => ds.modelName === name)?.dsMap
  if (!dsMap) {
    return workerData.sharedMap
  }
  return dsMap
}

/**
 * Decorator adds support for thread-safe shared {@link Map} using
 * {@link SharedArrayBuffer}.
 *
 * @param {function():import('./datasource').default} createDataSource in {@link DataSourceFactory}
 * @param {import('./datasource-factory').DataSourceFactory} factory
 * @param {import('./datasource-factory').dsOpts} options
 * @returns {import('./datasource').default}
 */
export function withSharedMem (createDataSource, factory, name, options = {}) {
  // thread-safe map
  const sharedMap = isMainThread
    ? Object.assign(new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE), {
        modelName: name // assign modelName
      })
    : Object.setPrototypeOf(
        // SharedMap can be passed in for related ds
        getSharedMap(name),
        SharedMap.prototype
      ) // unmarshal

  // call with shared map and mixin that extends ds class
  return createDataSource.call(factory, name, {
    ...options,
    dsMap: sharedMap,
    mixin: DsClass => class SharedMemDs extends SharedMemMixin(DsClass) {}
  })
}

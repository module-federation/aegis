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

/** @typedef {import('./datasource-factory').default} DataSourceFactory */

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

/**
 *
 * @param {string} name i.e. modelName
 * @returns {SharedMap}
 */
function findSharedMap (name) {
  try {
    if (workerData.dsRelated) {
      const dsRel = workerData.dsRelated.find(ds => ds.modelName === name)
      if (dsRel) {
        return dsRel.dsMap
      }
    }
  } catch (error) {
    console.warn(error)
  }

  if (name === workerData.modelName) return workerData.sharedMap

  return new Map()
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
  const mapsize = options.mapsize || MAPSIZE
  const keysize = options.keysize || KEYSIZE
  const objsize = options.objsize || OBJSIZE

  // use thread-safe shared map
  const sharedMap = isMainThread
    ? Object.assign(new SharedMap(mapsize, keysize, objsize), {
        modelName: name // assign modelName
      })
    : Object.setPrototypeOf(
        // find mem addr and rehydrate
        findSharedMap(name),
        SharedMap.prototype
      )

  // call with shared map and mixin that extends ds class
  return createDataSource.call(factory, name, {
    ...options,
    dsMap: sharedMap,
    mixin: DsClass => class SharedMemDs extends SharedMemMixin(DsClass) {}
  })
}

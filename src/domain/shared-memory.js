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
const SharedMemoryMixin = superclass =>
  class extends superclass {
    /**
     * @override
     * @returns {import('.').Model}
     */
    saveSync (id, data) {
      return super.saveSync(id, JSON.stringify(data))
    }

    /**
     * Deserialize
     * @override
     * @param {*} id
     * @returns {import('.').Model}
     */
    findSync (id) {
      try {
        if (!id) return console.log('no id provided', id)
        const modelString = super.findSync(id)
        if (!modelString) return
        const model = JSON.parse(modelString)
        if (isMainThread) return model
        return ModelFactory.loadModel(broker, this, model, this.name)
      } catch (error) {
        console.error({ fn: this.findSync.name, error })
      }
    }

    /**
     * @override
     * @returns {import('.').Model[]}
     */
    _listSync () {
      return this.dsMap.map(v => JSON.parse(v))
    }

    /**
     * @override
     * @returns {number}
     */
    count () {
      return this.dsMap.length
    }
  }

/**
 *
 * @param {string} name i.e. modelName
 * @returns {SharedMap}
 */
function findSharedMap (name) {
  try {
    if (name === workerData.modelName) return workerData.sharedMap

    if (workerData.dsRelated?.length > 0) {
      const dsRel = workerData.dsRelated.find(ds => ds.modelName === name)
      if (dsRel) {
        return dsRel.dsMap
      }
    }
    return new Map()
  } catch (error) {
    console.warn(error)
  }
}

function createSharedMap (mapsize, keysize, objsize, name) {
  try {
    return isMainThread
      ? Object.assign(new SharedMap(mapsize, keysize, objsize), {
          modelName: name // assign modelName
        })
      : Object.setPrototypeOf(findSharedMap(name), SharedMap.prototype)
  } catch (error) {
    console.error(error)
  }
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
export function withSharedMemory (
  createDataSource,
  factory,
  name,
  options = {}
) {
  const mapsize = options.mapsize || MAPSIZE
  const keysize = options.keysize || KEYSIZE
  const objsize = options.objsize || OBJSIZE

  // use thread-safe shared map
  const sharedMap = createSharedMap(mapsize, keysize, objsize, name)

  if (sharedMap instanceof SharedMap)
    return createDataSource.call(factory, name, {
      ...options,
      dsMap: sharedMap,
      mixins: options.mixins.push(
        class DataSourceSharedMemory extends SharedMemoryMixin(DsClass) {}
      )
    })

  return createDataSource.call(factory, name, options)
}

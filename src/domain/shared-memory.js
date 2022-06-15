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

const dataType = {
  write: {
    string: x => x,
    object: x => JSON.stringify(x),
    number: x => x
  },
  read: {
    string: x => JSON.parse(x),
    object: x => x,
    number: x => x
  }
}

/** @typedef {import('./datasource-factory').default} DataSourceFactory */

/**
 * compositional class mixin - so any class
 * in the hierarchy can use shared memory
 * @param {import('./datasource').default} superclass
 * @returns {import('./datasource').default} s.hared memory
 * @callback
 */
const SharedMemoryMixin = superclass =>
  class extends superclass {
    constructor (map, factory, name) {
      super(map, factory, name)

      // Indicate which class we extend
      this.className = super.className
      this.mixinClass = this.constructor.name
    }

    /**
     * @override
     * @returns {import('.').Model}
     */
    mapSet (id, data) {
      return this.dsMap.set(id, dataType.write[typeof data](data))
    }

    /**
     * Deserialize
     * @override
     * @param {*} id
     * @returns {import('.').Model}
     */
    mapGet (id) {
      try {
        if (!id) return console.log('no id provided')
        const raw = this.dsMap.get(id)
        if (!raw) return console.log('no data')
        const data = dataType.read[typeof raw](raw)

        return isMainThread
          ? data
          : ModelFactory.loadModel(broker, this, data, this.name)
      } catch (error) {
        console.error({ fn: this.mapGet.name, error })
      }
    }

    /**
     * @override
     * @returns
     */
    mapToArray () {
      return this.dsMap.map(v => JSON.parse(v))
    }

    mapCount () {
      return this.dsMap.length
    }

    getClassName () {
      return this.className
    }
  }

/**
 *
 * @param {string} name i.e. modelName
 * @returns {SharedMap}
 */
function findSharedMap (name) {
  if (name === workerData.modelName) return workerData.sharedMap

  if (workerData.dsRelated?.length > 0) {
    const dsRel = workerData.dsRelated.find(ds => ds.modelName === name)
    if (dsRel) return dsRel.dsMap
  }
  return null
}

function rehydrateSharedMap (name) {
  const sharedMap = findSharedMap(name)
  if (sharedMap) return Object.setPrototypeOf(sharedMap, SharedMap.prototype)
}

function createSharedMap (mapsize, keysize, objsize, name) {
  return Object.assign(new SharedMap(mapsize, keysize, objsize), {
    modelName: name // assign modelName
  })
}

/**
 * Decorator adds support for thread-safe shared {@link Map} using {@link SharedArrayBuffer}.
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

  try {
    // use thread-safe shared map
    const sharedMap = isMainThread
      ? createSharedMap(mapsize, keysize, objsize, name)
      : rehydrateSharedMap(name)

    if (sharedMap instanceof SharedMap)
      return createDataSource.call(factory, name, {
        ...options,
        dsMap: sharedMap,
        mixins: [
          DsClass =>
            class DataSourceSharedMemory extends SharedMemoryMixin(DsClass) {}
        ].concat(options.mixins)
      })

    return createDataSource.call(factory, name, options)
  } catch (error) {
    console.error({ fn: withSharedMemory.name, error })
  }
}

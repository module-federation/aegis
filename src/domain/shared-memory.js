'use strict'

import SharedMap from 'sharedmap'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
import { EventBrokerFactory } from '.'

const broker = EventBrokerFactory.getInstance()

// size is in UTF-16 codepoints
const MAPSIZE = 2048 * 56
const KEYSIZE = 64
const OBJSIZE = 4056

function logError (x) {
  const errObj = { msg: 'unexpected datatype', type: typeof x, value: x }
  console.error(errObj)
  throw new Error(JSON.stringify(errObj))
}

const dataType = {
  write: {
    string: x => logError(x),
    object: x => JSON.stringify(x),
    number: x => logError(x),
    symbol: x => logError(x),
    undefined: x => logError(x)
  },
  read: {
    string: x => JSON.parse(x),
    object: x => logError(x),
    number: x => logError(x),
    symbol: x => logError(x),
    undefined: x => logError(x)
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
    constructor (map, name, namespace, options) {
      super(map, name, namespace, options)
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
      if (!id) {
        return console.warn({ fn: this.mapGet.name, msg: 'no id provided' })
      }

      try {
        const jsonStr = this.dsMap.get(id)
        if (!jsonStr) {
          return console.warn({ fn: this.mapGet.name, msg: 'no data found' })
        }

        const jsonObj = dataType.read[typeof jsonStr](jsonStr)
        if (!jsonObj || typeof jsonObj !== 'object') {
          throw new Error('problem reading data from shared mem')
        }

        return isMainThread
          ? jsonObj // main thread objects remain dehydrated
          : ModelFactory.loadModel(broker, this, jsonObj, this.name)
      } catch (error) {
        console.error({ fn: this.mapGet.name, error })
      }
    }

    /**
     * @override
     * @returns
     */
    mapToArray () {
      return this.dsMap.map(v =>
        isMainThread
          ? JSON.parse(v)
          : ModelFactory.loadModel(broker, this, JSON.parse(v), this.name)
      )
    }

    /**
     * @override
     * @returns
     */
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
  if (name === workerData.poolName) return workerData.sharedMap

  if (workerData.dsRelated?.length > 0) {
    const dsRel = workerData.dsRelated.find(ds => ds.modelName === name)
    if (dsRel) return dsRel.dsMap
  }
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
  namespace,
  options = {}
) {
  const mapsize = options.mapsize || process.env.MAPSIZE || MAPSIZE
  const keysize = options.keysize || process.env.KEYSIZE || KEYSIZE
  const objsize = options.objsize || process.env.OBJSIZE || OBJSIZE

  try {
    // use thread-safe shared map
    const sharedMap = isMainThread
      ? createSharedMap(mapsize, keysize, objsize, name)
      : rehydrateSharedMap(name)

    if (sharedMap instanceof SharedMap) {
      return createDataSource.call(factory, name, namespace, {
        ...options,
        dsMap: sharedMap,
        mixins: [DsClass => class extends SharedMemoryMixin(DsClass) {}].concat(
          options.mixins || []
        )
      })
    }

    return createDataSource.call(factory, name, namespace, options)
  } catch (error) {
    console.error({ fn: withSharedMemory.name, error })
  }
}

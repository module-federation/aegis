'use strict'

import SharedMap, { SharedMapOptions } from 'sharedmap'
import asyncPipe from './util/async-pipe'
import ModelFactory from '.'
import { isMainThread, workerData } from 'worker_threads'
SharedMapOptions
// const MAPSIZE = 128 * 1024 * 1024
const MAPSIZE = 2048 * 128
// Size is in UTF-16 codepointse
const KEYSIZE = 32
const OBJSIZE = 1024
/**
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
      const serDat = JSON.stringify(data)
      console.debug({ fn: this.save.name, serDat })
      return super.save(id, serDat)
    }

    /**
     * @override
     * @param {*} id
     * @returns
     */
    async find (id) {
      const model = asyncPipe(super.find, JSON.parse)(id)
      console.debug({ fn: this.find.name, model })
      return model.then(model =>
        // return fully hydrated
        ModelFactory.loadModel(
          EventBrokerFactory.getInstance(),
          this,
          model,
          model.modelName
        )
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

    toJSON () {
      return this.dataSource
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

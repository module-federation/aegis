'use strict'

import { isMainThread } from 'worker_threads'
import { SharedMap } from 'sharedmap'
import pipe from './util/pipe'

// const MAPSIZE = 128 * 1024 * 1024
const MAPSIZE = 2048
// Size is in UTF-16 codepointse
const KEYSIZE = 48
const OBJSIZE = 16
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
      super.save(id, serDat)
    }

    /**
     * @override
     * @param {*} id
     * @returns
     */
    async find (id) {
      const model = pipe(super.find, JSON.parse)(id)

      if (isMainThread) {
        // return deserialized
        return model
      } else {
        // return fully hydrated
        return ModelFactory.loadModel(
          EventBrokerFactory.getInstance(),
          this,
          model,
          model.modelName
        )
      }
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
  }

export function sharedMemExtension (
  DataSource,
  factory,
  name,
  sharedMap = null
) {
  class SharedMemDs extends SharedMemMixin(DataSource) {}
  const map = sharedMap || new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE)
  return new SharedMemDs(map, factory, name)
}

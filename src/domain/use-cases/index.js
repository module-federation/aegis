'use strict'

import makeAddModel from './add-model'
import makeEditModel from './edit-model'
import makeListModels from './list-models'
import makeFindModel from './find-model'
import makeRemoveModel from './remove-model'
import makeLoadModels from './load-models'
import makeListConfig from './list-configs'
import makeHotReload from './hot-reload'
import ModelFactory from '../model-factory'
import DataSourceFactory from '../datasource-factory'
import ThreadPoolFactory from '../thread-pool.js'
import EventBrokerFactory from '../event-broker'
import brokerEvents from './broker-events'
import { isMainThread } from 'worker_threads'

export function registerEvents () {
  // main thread handles event dispatch
  brokerEvents(
    EventBrokerFactory.getInstance(),
    DataSourceFactory,
    ModelFactory,
    ThreadPoolFactory
  )
}

/**
 *
 * @param {import('..').ModelSpecification} model
 */
function buildOptions (model) {
  const options = {
    modelName: model.modelName,
    models: ModelFactory,
    broker: EventBrokerFactory.getInstance(),
    handlers: model.eventHandlers
  }

  if (isMainThread) {
    return {
      ...options,
      // main thread does not write to persistent store
      repository: DataSourceFactory.getDataSource(model.modelName, {
        sharedMap: true
      }),
      // only main thread knows about thread pools (no nesting)
      threadpool: ThreadPoolFactory.getThreadPool(model.modelName, {
        preload: false
      })
    }
  } else {
    return {
      ...options,
      // only worker threads can write to persistent storage
      repository: DataSourceFactory.getDataSource(model.modelName, {
        sharedMap: true
      })
    }
  }
}

/** @typedef {import('../datasource-factory').Model} Model */

/**
 * Generate use case functions for every model
 * @param {string} modelName
 * @param {function({}):function():Promise<Model>} factory
 * @returns
 */
function make (factory) {
  const specs = ModelFactory.getModelSpecs()
  return specs.map(spec => ({
    endpoint: spec.endpoint,
    fn: factory(buildOptions(spec))
  }))
}

/**
 * Generate use case functions for just one model
 * @param {string} modelName
 * @param {function({}):function():Promise<Model>} factory
 * @returns
 */
function makeOne (modelName, factory) {
  const spec = ModelFactory.getModelSpec(modelName)
  return factory(buildOptions(spec))
}

const addModels = () => make(makeAddModel)
const editModels = () => make(makeEditModel)
const listModels = () => make(makeListModels)
const findModels = () => make(makeFindModel)
const removeModels = () => make(makeRemoveModel)
const loadModelSpecs = () => make(makeLoadModels)
const hotReload = () => [
  {
    endpoint: 'reload',
    fn: makeHotReload({
      models: ModelFactory,
      broker: EventBrokerFactory.getInstance()
    })
  }
]
const listConfigs = () =>
  makeListConfig({
    models: ModelFactory,
    data: DataSourceFactory,
    broker: EventBrokerFactory.getInstance(),
    threadpools: ThreadPoolFactory
  })

export const UseCases = {
  addModels,
  editModels,
  listModels,
  findModels,
  removeModels,
  loadModelSpecs,
  listConfigs,
  hotReload,
  registerEvents
}

/**@typedef */
export function UseCaseService (modelName = null) {
  if (modelName) {
    const modelNameUpper = String(modelName).toUpperCase()
    return {
      addModel: makeOne(modelNameUpper, makeAddModel),
      editModel: makeOne(modelNameUpper, makeEditModel),
      listModels: makeOne(modelNameUpper, makeListModels),
      findModel: makeOne(modelNameUpper, makeFindModel),
      removeModel: makeOne(modelNameUpper, makeRemoveModel),
      loadModelSpecs: makeOne(modelNameUpper, makeLoadModels),
      listConfigs: listConfigs()
    }
  }
  return {
    addModels: addModels(),
    editModels: editModels(),
    listModels: listModels(),
    findModels: findModels(),
    removeModels: removeModels(),
    loadModelSpecs: loadModelSpecs(),
    hotReload: hotReload(),
    listConfigs: listConfigs()
  }
}

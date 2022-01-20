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
import executeCommand from './execute-command'
import { isMainThread } from 'worker_threads'

export function registerEvents () {
  brokerEvents(
    EventBrokerFactory.getInstance(),
    DataSourceFactory,
    ModelFactory
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
    handlers: model.eventHandlers,
    threadpool: null
  }
  if (isMainThread) {
    console.debug('creating thread pool for ', model.modelName)
    return {
      ...options,
      repository: DataSourceFactory.getDataSource(model.modelName, {
        memoryOnly: true
      }),
      threadpool: ThreadPoolFactory.getThreadPool(model.modelName, {
        preload: false
      })
    }
  } else {
    return {
      ...options,
      repository: DataSourceFactory.getDataSource(model.modelName)
    }
  }
}

function make (factory) {
  const specs = ModelFactory.getModelSpecs()
  return specs.map(spec => ({
    endpoint: spec.endpoint,
    fn: factory(buildOptions(spec))
  }))
}

function makeOne (modelName, factory) {
  const spec = ModelFactory.getModelSpec(modelName, { preload: false })
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
  makeListConfig({ models: ModelFactory, data: DataSourceFactory })

export const UseCases = {
  addModels,
  editModels,
  listModels,
  findModels,
  removeModels,
  loadModelSpecs,
  executeCommand,
  listConfigs,
  hotReload
}

export function UseCaseService (modelName = null) {
  if (modelName) {
    return {
      addModel: makeOne(modelName, makeAddModel),
      editModel: makeOne(modelName, makeEditModel),
      listModels: makeOne(modelName, makeListModels),
      findModel: makeOne(modelName, makeFindModel),
      removeModel: makeOne(modelName, makeRemoveModel),
      loadModelSpecs: makeOne(modelName, makeLoadModels),
      executeCommand,
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
    listConfigs: listConfigs(),
    executeCommand: { fn: executeCommand }
  }
}

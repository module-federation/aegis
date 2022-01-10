'use strict'

import makeAddModel from './add-model'
import makeEditModel from './edit-model'
import makeListModels from './list-models'
import makeFindModel from './find-model'
import makeRemoveModel from './remove-model'
import makeLoadModels from './load-models'
import makeListConfig from './list-configs'
import DataSourceFactory from '../datasource-factory'
import ThreadPoolFactory from '../thread-pool'
import ModelFactory from '../model-factory'
import EventBrokerSingleton from '../event-broker'
import brokerEvents from './broker-events'
import { isMainThread } from 'worker_threads'

export function registerEvents () {
  brokerEvents(
    EventBrokerSingleton.getInstance(),
    DataSourceFactory,
    ModelFactory
  )
}

/**
 *
 * @param {import('..').ModelSpecification} model
 */
function buildOptions (model) {
  options = {
    modelName: model.modelName,
    models: ModelFactory,
    broker: EventBrokerSingleton.getInstance(),
    handlers: model.eventHandlers,
    repository: DataSourceFactory.getDataSource(model.modelName),
    threadpool: null
  }
  if (isMainThread) {
    return {
      ...options,
      threadpool: ThreadPoolFactory.getThreadPool(model.modelName)
    }
  } else {
    return options
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
  const spec = ModelFactory.getModelSpec(modelName)
  return factory(buildOptions(spec))
}

export const addModels = () => make(makeAddModel)
export const editModels = () => make(makeEditModel)
export const listModels = () => make(makeListModels)
export const findModels = () => make(makeFindModel)
export const removeModels = () => make(makeRemoveModel)
export const loadModelSpecs = () => make(makeLoadModels)
export const listConfigs = () =>
  makeListConfig({ models: ModelFactory, data: DataSourceFactory })

export function UseCaseService (modelName) {
  return {
    addModel: makeOne(modelName, makeAddModel),
    editModel: makeOne(modelName, makeEditModel),
    listModels: makeOne(modelName, makeListModels),
    findModel: makeOne(modelName, makeFindModel),
    removeModel: makeOne(modelName, makeRemoveModel),
    loadModelSpecs: makeOne(modelName, makeLoadModels),
    listConfigs: listConfigs()
  }
}

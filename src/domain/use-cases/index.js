'use strict'

import makeAddModel from './add-model'
import makeEditModel from './edit-model'
import makeListModels from './list-models'
import makeFindModel from './find-model'
import makeRemoveModel from './remove-model'
import makeLoadModels from './load-models'
import makeListConfig from './list-configs'
import DataSourceFactory from '../datasource-factory'
import EventBrokerSingleton from '../event-broker'
import ModelFactory from '../model-factory'
import brokerEvents from './broker-events'

export function registerEvents() {
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
function buildOptions(model) {
  return {
    modelName: model.modelName,
    models: ModelFactory,
    broker: EventBrokerSingleton.getInstance(),
    handlers: model.eventHandlers,
    repository: DataSourceFactory.getDataSource(model.modelName)
  }
}

function make(factory) {
  const specs = ModelFactory.getModelSpecs()
  return specs.map(spec => ({
    endpoint: spec.endpoint,
    fn: factory(buildOptions(spec))
  }))
}

export const addModels = () => make(makeAddModel)
export const editModels = () => make(makeEditModel)
export const listModels = () => make(makeListModels)
export const findModels = () => make(makeFindModel)
export const removeModels = () => make(makeRemoveModel)
export const loadModelSpecs = () => make(makeLoadModels)
export const listConfigs = () =>
  makeListConfig({ models: ModelFactory, data: DataSourceFactory })

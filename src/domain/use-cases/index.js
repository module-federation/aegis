'use strict'

import ModelFactory from '../model-factory'
import DataSourceFactory from '../datasource-factory'
import ThreadPoolFactory from '../thread-pool.js'
import EventBrokerFactory from '../event-broker'

import makeAddModel from './add-model'
import makeEditModel from './edit-model'
import makeListModels from './list-models'
import makeFindModel from './find-model'
import makeRemoveModel from './remove-model'
import makeLoadModels from './load-models'
import makeDeployModel from './deploy-model'
import makeListConfig from './list-configs'
import makeEmitEvent from './emit-event'
import makeHotReload from './hot-reload'
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
 * @param {*} modelName
 * @returns
 */
function findLocalRelatedModels (modelName) {
  const localModels = ModelFactory.getModelSpecs().map(spec =>
    spec.modelName.toUpperCase()
  )
  const spec = ModelFactory.getModelSpec(modelName)
  const result = !spec?.relations
    ? []
    : Object.keys(spec.relations)
        .map(k => spec.relations[k].modelName.toUpperCase())
        .filter(modelName => localModels.includes(modelName))
  return result
}

/**
 *
 * @param {*} modelName
 * @returns
 */
function findLocalRelatedDatasources (modelName) {
  return findLocalRelatedModels(modelName).map(modelName => ({
    modelName,
    dsMap: DataSourceFactory.getSharedDataSource(modelName).dsMap
  }))
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
    const ds = DataSourceFactory.getSharedDataSource(model.modelName)

    return {
      ...options,
      // main thread does not write to persistent store
      repository: ds,

      // only main thread knows about thread pools (no nesting)
      threadpool: ThreadPoolFactory.getThreadPool(model.modelName, {
        preload: false,
        sharedMap: ds.dsMap,
        dsRelated: findLocalRelatedDatasources(model.modelName)
      }),

      // if caller provides id, use it as key for idempotency
      async idempotent (input) {
        if (!input.requestId) return
        return ds.find(m => m.getId() === input.requestId)
      }
    }
  } else {
    return {
      ...options,
      // only worker threads can write to persistent storage
      repository: DataSourceFactory.getSharedDataSource(model.modelName)
    }
  }
}

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
  const spec = ModelFactory.getModelSpec(modelName.toUpperCase())
  return factory(buildOptions(spec))
}

const addModels = () => make(makeAddModel)
const editModels = () => make(makeEditModel)
const listModels = () => make(makeListModels)
const findModels = () => make(makeFindModel)
const removeModels = () => make(makeRemoveModel)
const loadModels = () => make(makeLoadModels)
const emitEvents = () => make(makeEmitEvent)
const deployModels = () => make(makeDeployModel)
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
    broker: EventBrokerFactory.getInstance(),
    datasources: DataSourceFactory,
    threadpools: ThreadPoolFactory
  })

/**
 * Expose use-case functions l domain ports
 *
 * @param {*} modelName
 */
const domainPorts = modelName => ({
  ...UseCaseService(modelName),
  eventBroker: EventBrokerFactory.getInstance(),
  modelSpec: ModelFactory.getModelSpec(modelName),
  dataSource: DataSourceFactory.getDataSource(modelName)
})

/**
 *
 * @param {*} fn
 * @param {*} ports
 * @returns
 */
const userController = (fn, ports) => async (req, res) => {
  try {
    return await fn(req, res, ports)
  } catch (error) {
    console.error({ fn: userController.name, error })
    res.status(500).send({ msg: 'error occurred', error })
  }
}

/**
 *
 * @returns
 */
export function getUserRoutes () {
  return ModelFactory.getModelSpecs()
    .filter(spec => typeof spec.routes !== 'undefined')
    .map(spec =>
      spec.routes
        .filter(route => typeof route !== 'undefined')
        .map(route => {
          const userApi = domainPorts(spec.modelName)
          return Object.keys(route)
            .map(k =>
              typeof route[k] === 'function'
                ? {
                    [k]: userController(route[k], userApi)
                  }
                : { [k]: route[k] }
            )
            .reduce((a, b) => ({ ...a, ...b }))
        })
    )
    .flat()
}

export const UseCases = {
  addModels,
  editModels,
  listModels,
  findModels,
  removeModels,
  loadModels,
  listConfigs,
  hotReload,
  registerEvents,
  emitEvents,
  deployModels
}

/**
 * This service contains the set of inbound ports
 * handling all CRUD operations for domain models.
 * An alias for the service could be "InboundPorts"
 *
 * @param {string} [modelName]
 * @returns
 */
export function UseCaseService (modelName = null) {
  if (typeof modelName === 'string') {
    const modelNameUpper = modelName.toUpperCase()
    return {
      addModel: makeOne(modelNameUpper, makeAddModel),
      editModel: makeOne(modelNameUpper, makeEditModel),
      listModels: makeOne(modelNameUpper, makeListModels),
      findModel: makeOne(modelNameUpper, makeFindModel),
      removeModel: makeOne(modelNameUpper, makeRemoveModel),
      loadModels: makeOne(modelNameUpper, makeLoadModels),
      emitEvent: makeOne(modelNameUpper, makeEmitEvent),
      deployModel: makeOne(modelNameUpper, makeDeployModel),
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
    deployModel: deployModels(),
    hotReload: hotReload(),
    emitEvent: emitEvents(),
    listConfigs: listConfigs()
  }
}

'use strict'

import ModelFactory from '../model-factory'
import DataSourceFactory from '../datasource-factory'
import ThreadPoolFactory from '../thread-pool.js'
import EventBrokerFactory from '../event-broker'

import makeCreateModel from './create-model'
import makeEditModel from './edit-model'
import makeListModels from './list-models'
import makeFindModel from './find-model'
import makeRemoveModel from './remove-model'
import makeLoadModels from './load-models'
import makeDeployModel from './deploy-model'
import makeListConfig from './list-configs'
import makeEmitEvent from './emit-event'
import makeInvokePort from './invoke-port'
import makeHotReload from './hot-reload'
import brokerEvents from './broker-events'
import DistributedCache from '../distributed-cache'
import makeServiceMesh from './create-service-mesh.js'
import { PortEventRouter } from '../event-router'
import { isMainThread } from 'worker_threads'
import { hostConfig } from '../../config'
import { requestContext } from '../util/async-context'

export const serviceMeshPlugin =
  hostConfig.services.activeServiceMesh ||
  process.env.SERVICE_MESH_PLUGIN ||
  'webswitch'

export function registerEvents () {
  // main thread handles event dispatch
  brokerEvents({
    broker: EventBrokerFactory.getInstance(),
    datasources: DataSourceFactory,
    models: ModelFactory,
    threadpools: ThreadPoolFactory,
    PortEventRouter,
    DistributedCache,
    createServiceMesh: makeOne(serviceMeshPlugin, makeServiceMesh, {
      internal: true
    })
  })
}

export function modelsInDomain (domain) {
  return ModelFactory.getModelSpecs()
    .filter(s => s.domain && s.domain.toUpperCase() === domain.toUpperCase())
    .map(s => s.modelName.toUpperCase())
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

  if (!spec.domain) return result
  const models = modelsInDomain(spec.domain)
  const dedup = new Set(result.concat(models))
  return Array.from(dedup)
}

/**
 *
 * @param {*} modelName
 * @returns
 */
function findLocalRelatedDatasources (spec) {
  return findLocalRelatedModels(spec.modelName).map(modelName => ({
    modelName,
    dsMap: DataSourceFactory.getSharedDataSource(modelName, {
      domain: spec.domain
    }).dsMap
  }))
}

function getDataSource (modelName, options) {
  const { shared = true } = options
  return shared
    ? DataSourceFactory.getSharedDataSource(modelName, options)
    : isMainThread
    ? DataSourceFactory.getDataSource(modelName, options)
    : null
}

function getThreadPool (spec, ds, options) {
  if (spec.internal) return null
  return ThreadPoolFactory.getThreadPool(spec.domain, {
    ...options,
    preload: false,
    sharedMap: ds.dsMap,
    dsRelated: findLocalRelatedDatasources(spec)
  })
}

/**
 *
 * @param {import('..').ModelSpecification} spec
 */
function buildOptions (spec, options) {
  const invariant = {
    modelName: spec.modelName,
    models: ModelFactory,
    broker: EventBrokerFactory.getInstance(),
    handlers: spec.eventHandlers
  }

  if (isMainThread) {
    const ds = getDataSource(spec.modelName, options)
    return {
      ...invariant,
      // main thread does not write to persistent store
      repository: ds,
      // only main thread knows about thread pools (no nesting)
      threadpool: getThreadPool(spec, ds),
      // if caller provides id, use it as key for idempotency
      async idempotent () {
        return ds.find(requestContext.getStore().get('id'))
      }
    }
  } else {
    return {
      ...invariant,
      // only worker threads can write to persistent storage
      repository: getDataSource(spec.modelName, options)
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
    path: spec.path,
    ports: spec.ports,
    fn: factory(buildOptions(spec, { domain: spec.domain }))
  }))
}

/**
 * Generate use case functions for just one model
 * @param {string} modelName
 * @param {function({}):function():Promise<Model>} factory
 * @returns
 */
function makeOne (modelName, factory, options = {}) {
  const spec = ModelFactory.getModelSpec(modelName.toUpperCase(), options)
  return factory(buildOptions(spec, { domain: spec.domain }))
}

const createModels = () => make(makeCreateModel)
const editModels = () => make(makeEditModel)
const listModels = () => make(makeListModels)
const findModels = () => make(makeFindModel)
const removeModels = () => make(makeRemoveModel)
const loadModels = () => make(makeLoadModels)
const emitEvents = () => make(makeEmitEvent)
const deployModels = () => make(makeDeployModel)
const invokePorts = () => make(makeInvokePort)
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
 * Expose domain ports
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
 *returns
 * @param {*} fn
 * @param {*} ports
 * @
 */
const userController = (fn, ports) => async (req, res) => {
  try {
    return await fn(req, res, ports)
  } catch (error) {
    console.error({ fn: userController.name, error })
    res.status(500).json({ msg: 'error occurred', error })
  }
}

/**
 * Extract user-defined endpoints from the modelSpec and
 * decorate the user's callback such that it includes a
 * third argument, which is a set of inbound port functions
 * for he user to call.
 *
 * @returns {import('../index').endpoint}
 */
export function getUserRoutes () {
  try {
    return ModelFactory.getModelSpecs()
      .filter(spec => spec.routes)
      .map(spec =>
        spec.routes
          .filter(route => route)
          .map(route => {
            const api = domainPorts(spec.modelName)
            return Object.keys(route)
              .map(key =>
                typeof route[key] === 'function'
                  ? {
                      [key]: userController(route[key], api)
                    }
                  : { [key]: route[key] }
              )
              .reduce((a, b) => ({ ...a, ...b }))
          })
      )
      .flat()
  } catch (error) {
    console.error({ fn: getUserRoutes.name, error })
  }
}

export const UseCases = {
  createModels,
  editModels,
  listModels,
  findModels,
  removeModels,
  loadModels,
  listConfigs,
  hotReload,
  registerEvents,
  emitEvents,
  deployModels,
  invokePorts
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
      createModel: makeOne(modelNameUpper, makeCreateModel),
      editModel: makeOne(modelNameUpper, makeEditModel),
      listModels: makeOne(modelNameUpper, makeListModels),
      findModel: makeOne(modelNameUpper, makeFindModel),
      removeModel: makeOne(modelNameUpper, makeRemoveModel),
      loadModels: makeOne(modelNameUpper, makeLoadModels),
      emitEvent: makeOne(modelNameUpper, makeEmitEvent),
      deployModel: makeOne(modelNameUpper, makeDeployModel),
      invokePort: makeOne(modelNameUpper, makeInvokePort),
      listConfigs: listConfigs()
    }
  }
  return {
    createModels: createModels(),
    editModels: editModels(),
    listModels: listModels(),
    findModels: findModels(),
    removeModels: removeModels(),
    loadModelSpecs: loadModelSpecs(),
    deployModel: deployModels(),
    hotReload: hotReload(),
    emitEvent: emitEvents(),
    invokePort: invokePorts(),
    listConfigs: listConfigs()
  }
}

export function makeDomain (domain) {
  if (!domain) throw new Error('no domain provided')
  return modelsInDomain(domain.toUpperCase())
    .map(modelName => ({
      [modelName]: UseCaseService(modelName)
    }))
    .reduce((a, b) => ({ ...a, ...b }), {})
}

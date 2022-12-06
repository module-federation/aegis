'use strict'

/** @typedef {import("./model").Model} Model */
/** @typedef {import('./event').Event} Event */
/** @typedef {string} eventName */
/** @typedef {string} service - name of the service object to inject in adapter */
/** @typedef {number} timeout - call to adapter will timeout after `timeout` milliseconds */

/**
 * @callback onUpdate
 * @param {Model} model
 * @param {Object} changes
 * @returns {Model} updated model or throw
 * @throws {Error}
 */

/**
 * @callback onDelete
 * @param {Model} model
 * @returns {Model} updated model or throw
 * @throws {Error}
 */

/**
 * @callback validate
 * @param {Model} model
 * @param {*} changes
 * @returns {Model}
 * @throws {Error}
 */

/**
 * @typedef threshold
 * @property {number} errorRate
 * @property {number} callVolume
 */

/**
 * @typedef {{
 *  [x: string]: threshold
 * }} circuitBreaker
 */

/**
 * @typedef {{
 *  [x: string]: {
 *    service?: service,
 *    timeout?: timeout,
 *    consumesEvent?:string,
 *    producesEvent?:string,
 *    callback?: function({model: Model})
 *    errorCallback?: function({model: Model, port: string, error:Error}),
 *    timeoutCallback?: function({model: Model, port: string}),
 *    type?:'inbound'|'outbound',
 *    disabled?: boolean,
 *    adapter?: string,
 *    retries?: number,
 *    undo: function(Model, port),
 *    circuitBreaker: circuitBreaker
 *  }
 * }} ports - input/output ports for the domain
 */

/**
 * @typedef {{
 *  [x: string]: {
 *    modelName:string,
 *    type:"oneToMany"|"manyToOne"|"oneToOne"|"containsMany"|"custom"
 *    foreignKey:any,
 *    key?:any
 *  }
 * }} relations - define related domain entities
 */

/** @typedef {any} value*/
/** @typedef {any} key */

/**
 * @typedef {{
 *  on: "serialize" | "deserialize",
 *  key: string | "*" | RegExp | function(key,value):boolean
 *  type: (function(key,value):boolean) | "string" | "object" | "number" | "function" | "any" | RegExp
 *  value: function(key,value):any
 * }} serializer
 */

/**
 * @typedef {Array<function({
 *  eventName:string,
 *  eventType:string,
 *  eventTime:string,
 *  modelName:string,
 *  model:Model
 * }):Promise<void>>} eventHandler - callbacks invoked to handle domain and
 * application events
 */

/**
 * @typedef {{
 *  on: "serialize" | "deserialize",
 *  key: string | RegExp | "*" | (function(key,value):boolean)
 *  type: "string" | "object" | "number" | "function" | "any" | (function(key,value):boolean)
 *  value(key, value):value
 * }} serializer
 */

/**
 * @typedef {{
 *  [x:string]: {
 *    allow:string|function(*):boolean|Array<string|function(*):boolean>
 *    deny:string|function(*):boolean|Array<string|function(*):boolean>
 *    type:"role"|"relation"
 *    desc?:string
 *  }
 * }} accessControlList
 */

/**
 * @typedef {{
 *   [x: string]: {
 *    command:string|function(Model):Promise<any>,
 *    acl:accessControlList[]
 *  }
 * }} command - configure functions to execute when specified in a
 * URL parameter or query of the auto-generated REST API
 */

/**
 * @typedef datasourceConfig
 * @property {import('./datasource').default} datasource
 * @property {string} url - physical storage location: e.g. database url, file path
 * @property {function({DataSource}):DataSourcelw4l} adapterFactory - factory function to construct datasource adapter
 * @property {string} baseClass - name owkllllllllllllllf base class to extend
 * @property {number} [cacheSize] - maxium number of cached instances before purging
 * @property {number} [cacheSizeKb] - maximum size in kilobytes of cached instances before cache purge
 * @property {boolean} [cachedWrite] - allow cached instances of an object to write to persistent storage
 */

/**
 * @typedef {{
 *  [path: string]: {
 *    get?: controller,
 *    post?: controller,
 *    patch?: controller,
 *    delete?:controller
 *   }
 * }} endpoints
 */

/**
 * @typedef {Object} ModelSpecification Specify model data and behavior
 * @property {string} modelName name of model (case-insenstive)
 * @property {string} endpoint URI reference (e.g. plural of `modelName`)
 * @property {function(...args): any} factory factory function that creates model instance
 * @property {function()} [prototype] If the model has a protoype
 * @property {object} [dependencies] injected into the model for dependency and control inversion
 * @property {Array<import("./mixins").functionalMixin>} [mixins] favor functional composition over inheritance
 * to implement reusable domain logic, like input validation.
 * @property {onUpdate} [onUpdate] - Function called to handle update requests. Called
 * before save.
 * @property {onDelete} [onDelete] - Function called before deletion.
 * @property {validate} [validate] - validate model on creation and update
 * @property {ports} [ports] - input/output ports for the domain
 * @property {eventHandler[]} [eventHandlers] - callbacks invoked to handle application
 * events, e.g. CRUD events
 * @property {serializer[]} [serializers] - use for custom de/serialization of the model
 * when reading or writing to storage or network
 * @property {relations} [relations] - link related domain models
 * @property {command} [commands] - define functions to execute when specified in a
 * URL parameter or query of the auto-generated REST API
 * @property {accessControlList} [accessControlList] - configure authorization
 * @property {number} [start] - create `start` instances of the model
 * @property {datasourceConfig} [datasource] - define custom datasource
 * @property {Array<{ [method:string]: function(), path: string }>} [routes] - custom routes
 */

/**
 * @callback command
 * @param {object} request
 * @returns {void}
 */

/**
 * @typedef {object} system
 * @property {command} addCommand
 */

import ModelFactory from './model-factory'
import bindAdapters from './bind-adapters'
import { requestContext } from './util/async-context'
import uuid from './util/uuid'

import {
  importRemoteModels,
  importRemoteServices,
  importRemoteAdapters,
  importRemotePorts,
  importRemoteWorkers,
  importModelCache,
  importAdapterCache,
  importServiceCache,
  importWorkerCache,
  importPortCache
} from './import-remotes'

/**
 *
 * @param {Model} model
 */
const createEvent = model => ({ model })

/**
 * @param {{updated:Model,changes:Object}} param0
 */
const updateEvent = ({ updated, changes }) => ({
  model: updated,
  changes: {
    ...changes
  }
})

const deleteEvent = model => ({
  modelId: ModelFactory.getModelId(model),
  model
})

const onloadEvent = model => ({
  modelId: ModelFactory.getModelId(model),
  model
})

function getUniqueId () {
  return getContextId() || uuid()
}

function getContextId () {
  const store = requestContext.getStore()
  if (store) return store.get('id')
}

/**
 * Register the {@link ModelSpecification}: inject dependencies,
 * bind adapters, register events
 * @param {{model:ModelSpecification,
 * adapters:{[x:string]:Function},
 * services:{[x: string]:Function},
 * ports:{[x: string]:Function},
 * workers:{[x: string]:Function},
 * isCached:boolean}}
 */
function register ({
  model,
  ports,
  services,
  adapters,
  workers,
  isCached = false
} = {}) {
  const modelName = model.modelName.toUpperCase()

  const bindings = bindAdapters({
    portSpec: model.ports,
    adapters,
    services,
    ports
  })

  const dependencies = {
    ...model.dependencies,
    ...bindings,
    getUniqueId
  }

  ModelFactory.registerModel({
    ...model,
    modelName,
    domain: (model.domain || model.modelName).toUpperCase(),
    dependencies,
    factory: model.factory(dependencies),
    worker: workers[modelName],
    isCached
  })

  ModelFactory.registerEvent(
    ModelFactory.EventTypes.CREATE,
    modelName,
    createEvent
  )

  ModelFactory.registerEvent(
    ModelFactory.EventTypes.UPDATE,
    modelName,
    updateEvent
  )

  ModelFactory.registerEvent(
    ModelFactory.EventTypes.DELETE,
    modelName,
    deleteEvent
  )

  ModelFactory.registerEvent(
    ModelFactory.EventTypes.ONLOAD,
    modelName,
    onloadEvent
  )
}

/**
 * Imports remote models and overrides their service adapters
 * with those specified by the host config.
 * @param {*} remoteEntries -
 * @param {*} services - services on which the model depends
 * @param {*} adapters - adapters for talking to the services
 */
async function importModels ({
  remoteEntries,
  services,
  adapters,
  workers,
  ports
} = {}) {
  const models = await importRemoteModels(remoteEntries)
  models.forEach(model =>
    register({ model, services, adapters, ports, workers })
  )
}

let remotesConfig
let localOverrides = {}

/**
 * Import remote models, services, and adapters.
 * @param {import('../../webpack/remote-entries-type.js')} remoteEntries
 * @param {*} overrides - override or add services and adapters
 */
export async function importRemotes (remoteEntries, overrides = {}) {
  const services = await importRemoteServices(remoteEntries)
  const adapters = await importRemoteAdapters(remoteEntries)
  const workers = await importRemoteWorkers(remoteEntries)
  const ports = await importRemotePorts(remoteEntries)

  console.info({ services, adapters, ports, overrides, workers })

  await importModels({
    remoteEntries,
    services: {
      ...services,
      ...overrides
    },
    adapters: {
      ...adapters,
      ...overrides
    },
    ports: {
      ...ports,
      ...overrides
    },
    workers
  })

  remotesConfig = remoteEntries
  localOverrides = overrides
}

let modelCache
let adapterCache
let serviceCache
let portCache
let workerCache

export async function importRemoteCache (name) {
  try {
    if (!remotesConfig) {
      console.warn('distributed cache cannot be initialized')
      return
    }

    if (ModelFactory.getModelSpec(name.toUpperCase())) return

    if (!modelCache) {
      modelCache = await importModelCache(remotesConfig)
      // Check if we have since loaded the model
      adapterCache = {
        ...(await importAdapterCache(remotesConfig)),
        ...localOverrides
      }
      serviceCache = {
        ...(await importServiceCache(remotesConfig)),
        ...localOverrides
      }
      portCache = {
        ...(await importPortCache(remotesConfig)),
        ...localOverrides
      }
      workerCache = {
        ...(await importWorkerCache(remotesConfig)),
        ...localOverrides
      }
    }

    if (ModelFactory.getModelSpec(name.toUpperCase())) return

    if (!modelCache) {
      console.error('no models found in cache')
      return
    }

    const model = modelCache
      .filter(m => m.modelName)
      .find(model => model.modelName.toUpperCase() === name.toUpperCase())

    if (!model) {
      console.error('could not find model in cache', name.toUpperCase())
      return
    }

    register({
      model,
      services: serviceCache,
      adapters: adapterCache,
      ports: portCache,
      workers: workerCache,
      isCached: true
    })
  } catch (e) {
    console.error(importRemoteCache.name, e)
  }
}

/**
 * The total number of services deployed to a host. A
 * service corresponds to a bounded context containing
 * one or more subdomains. Each Aegis domain model represents
 * a service unless it specifies the name of another model in
 * `ModelSpecification.domain`, in which case it is a subdomain
 * within a bounded context or simply a supporting entity or utility.
 * If it specifies its own name, then that is the name of a bounded
 * context (service) of which other models can be members. Models
 * in a bounded context run in the same threadpool and
 * share the same storage namespace (e.g. their data live in the
 * same database).
 *
 * @returns {number} sum of domains deployed to host
 */
export const totalServices = () =>
  ModelFactory.getModelSpecs().filter(
    s => !s.isCached && (!s.domain || s.modelName === s.domain)
  ).length

export { UseCaseService } from './use-cases'

export { default as EventBrokerFactory } from './event-broker'

export { default as DistributedCache } from './distributed-cache'

export { default as DataSourceFactory } from './datasource-factory'

export { default as ThreadPoolFactory } from './thread-pool'

export { default as DomainEvents } from './domain-events'

export { AppError } from '../domain/util/app-error'

export { makeDomain } from './use-cases'

export { requestContext } from '../domain/util/async-context'

export default ModelFactory

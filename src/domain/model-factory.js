'use strict'

import Model from './model'
import Event from './event'

/** @typedef {'CREATE' | 'UPDATE' | 'DELETE'} EventType */
/** @typedef {import('./index').ModelSpecification} ModelSpecification */
/** @typedef {import('./event-broker').EventBroker} broker */
/** @typedef {import('./datasource').default} Datasource */
/** @typedef {import('./model').Model} Model */

/**
 * @callback loadModel
 * @param {import('./event-broker') broker
 * @param {}
 */

/**
 * @typedef {Object} ModelFactory Low-level port functions for creating, updating, deleting domain models. To be called by
 * application use-case functions, which in turn are called by driving/primary adapters.
 * @property {function(broker,Datasource,string,...args):Promise<Readonly<Model>>} createModel Create a new model instance
 * @property {function(string,string,*):Readonly<Event>} createEvent
 * @property {function(Model,object):Model} updateModel
 * @property {function(Model):Model} deleteModel
 * @property {function(string,string):string} getEventName
 * @property {{CREATE:string,UPDATE:string,DELETE:string,ONLOAD:string}} EventTypes
 * @property {function(any):string} getModelId
 * @property {function(Model):string[]} getPortFlow
 * @property {loadModel} loadModel
 * @property {function():ModelSpecification[]} getRemoteModels
 * @property {function():ModelSpecification[]} getModelSpecs
 * @property {function(Model|string):ModelSpecification} getModelSpec
 */

/**
 * @readonly
 * @enum {EventType}
 */
const EventTypes = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ONLOAD: 'ONLOAD'
}

/**
 * @param {String} modelName
 */
function checkModelName (modelName) {
  if (typeof modelName === 'string') {
    return String(modelName).toUpperCase()
  }
  throw new Error('modelName missing or invalid')
}

/**
 *
 * @param {EventType} eventType
 */
function checkEventType (eventType) {
  return eventType
}

/**
 *
 * @param {EventType} eventType
 * @param {String} modelName
 */
function createEventName (eventType, modelName) {
  return checkEventType(eventType) + String(modelName).toUpperCase() // create for non-loaded
}

/**
 * @todo handle all state same way
 * @type {Map<string,ModelSpecification>}
 */
const modelFactories = new Map()

/**
 * @type {{[x: string]: Map<string,function(string,EventType,function()):Event>}}
 */
const eventFactories = {
  [EventTypes.CREATE]: new Map(),
  [EventTypes.UPDATE]: new Map(),
  [EventTypes.DELETE]: new Map(),
  [EventTypes.ONLOAD]: new Map()
}

/**
 * Register model types and create model instances.
 * @type {ModelFactory}
 */
const ModelFactory = {
  /**
   * Register a factory function to create the model `modelName`
   * @param {ModelSpecification} model
   */
  registerModel: model => {
    const name = checkModelName(model.modelName)
    if (!modelFactories.has(name)) {
      modelFactories.set(name, model)
    } else {
      console.log('deleting and readding model spec', name)
      modelFactories.delete(name)
      modelFactories.set(name, model)
    }
  },

  /**
   * Register a factory function to create an event for the model `modelName`
   * @param {EventType} eventType type of event
   * @param {String} modelName model the event is about
   * @param {Function} factory factory function
   */
  registerEvent: (eventType, modelName, factory) => {
    const name = checkModelName(modelName)
    const type = checkEventType(eventType)

    if (typeof factory === 'function') {
      eventFactories[type].set(name, factory)
    }
  },

  /**
   * Call the factory function previously registered for `modelName`
   * @param {String} modelName - model's name
   * @param {*[]} args - input sent in the request
   * @param {import('./event-broker').EventBroker} broker - send & receive events
   * @param {import('./datasource').default} datasource - persistence/cache
   * @returns {Promise<Readonly<Model>>} the model instance
   */
  createModel: async function (broker, datasource, modelName, ...args) {
    const name = checkModelName(modelName)
    const spec = modelFactories.get(name)

    if (spec) {
      return Model.create({
        args,
        spec: {
          ...spec,
          broker,
          datasource
        }
      })
    }
    throw new Error('unregistered model')
  },

  /**
   * Unmarshalls a deserialized model.
   * @param {import(".").Model} model
   * @param {*} modelName
   */
  loadModel: (broker, datasource, model, modelName) => {
    const name = checkModelName(modelName)
    const spec = modelFactories.get(name)

    if (spec) {
      return Model.load({
        model,
        spec: {
          ...spec,
          broker,
          datasource
        }
      })
    }
    throw new Error('unregistered model', name)
  },

  /**
   * Call factory function previously registered for `eventType` and `model`
   * @param {EventType} eventType
   * @param {String} modelName
   * @param {*} args
   * @returns {Readonly<Event>} the event instance
   */
  createEvent: (eventType, modelName, args) => {
    const name = checkModelName(modelName)
    const type = checkEventType(eventType)
    const factory = eventFactories[type].get(name)

    if (factory) {
      return Event.create({
        args,
        factory,
        eventType: type,
        modelName: name
      })
    }
    throw new Error('unregistered model event')
  },

  /**
   * Get federated models imported from remote server
   * @deprecated
   */
  getRemoteModels: () => [...modelFactories.values()],

  /**
   * Get federated models imported from remote server
   * @returns
   */
  getModelSpecs: () =>
    [...modelFactories.values()].filter(spec => !spec.internal),

  /**
   * Get the model's specification
   * @param {Model|string} model
   */
  getModelSpec: (model, options) => {
    if (!model) return
    const name = typeof model === 'object' ? Model.getName(model) : model
    const spec = modelFactories.get(checkModelName(name))
    if (spec) {
      if (spec.internal) {
        return spec.internal && options?.internal ? spec : null
      }
      return spec
    }
  },

  getEvents: () =>
    Object.keys(eventFactories).map(k => ({
      type: k,
      events: [...eventFactories[k].keys()]
    })),

  /**
   *
   * @param {Model} model - original model
   * @param {*} changes - object with updated properties
   * @returns {Model} updated model
   */
  updateModel: (model, changes) => Model.update(model, changes),

  /**
   *
   * @param {Model} model
   */
  deleteModel: model => Model.delete(model),

  /**
   * Call `dispose()` on each factory to release resources,
   * then delete them.
   */
  clearModels: () => {
    modelFactories.forEach(mf => {
      if (mf.dispose) mf.dispose()
    })
    modelFactories.clear()
  },

  /**
   * Get ID of model
   * @param {Model} model
   */
  getModelId: model => Model.getId(model),

  /**
   * Get model's name
   */
  getModelName: model => Model.getName(model),

  /**
   * Get `eventName` value
   */
  getEventName: createEventName,

  EventTypes
}

Object.freeze(modelFactories)
Object.freeze(eventFactories)
Object.freeze(ModelFactory)
Object.freeze(EventTypes)

export default ModelFactory

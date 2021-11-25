'use strict'

import makeArray from './util/make-array'
import { relationType } from './make-relations'
import { importRemoteCache } from '.'
import domainEvents from '../domain/domain-events'
import { nanoid } from 'nanoid'
const {
  internalCacheRequest,
  internalCacheResponse,
  externalCacheRequest,
  externalCacheResponse,
  externalCrudEvent
} = domainEvents

/**
 * Implements distributed object cache. Find any model
 * referenced by a relation that is not registered in
 * the model factory and listen for remote CRUD events
 * from it. On receipt of the event, import its remote
 * modules if we don't already have them, then rehydrate
 * and save the model instance to the cache. Subscribe
 * to external and broadcast internal on-demand requests,
 * i.e. cache misses.
 *
 * @param {{
 *  observer:import("./observer").Observer,
 *  datasources:import("./datasource-factory").DataSourceFactory,
 *  models:import("./model-factory").ModelFactory,
 *  subscribe:function(...args),
 *  publish:function(...args),
 * }} param0
 */
export default function DistributedCache ({
  models,
  observer,
  datasources,
  publish,
  subscribe
}) {
  /**
   * @typedef {{
   *  eventName:string,
   *  modelName:string,
   *  modelId:string,
   *  model:import("./model").Model,
   *  args:[],
   *  relation:{
   *    type:string,
   *    modelName:string,
   *    foreignKey:string}
   * }} Event the unit of data for tramsmission of cached data
   */

  /** @typedef {import(".").ModelSpecification} ModelSpecification*/

  /**
   * parse input into {@link Event}
   * @param {Event|string} payload
   * @returns {Event}
   */
  function parse (payload) {
    try {
      const event = payload
      const eventName = event.eventName
      const eventUuid = event.eventUuid
      const modelName = event.modelName?.toLowerCase()
      const model = event.model
      const modelId = event.id || event.modelId
      const relation = event.relation // optional
      const args = event.args // optional;

      if (!eventName || !modelName || !modelId || !eventUuid)
        throw new Error('invalid message format')

      return {
        eventName,
        eventUuid,
        modelName,
        model,
        modelId,
        relation,
        args
      }
    } catch (e) {
      console.error('could not parse message', e, payload)
    }
  }

  /**
   *
   * @param {*} eventName
   * @param {*} modelName
   * @param {Event} event
   * @returns
   */
  async function handleDelete (eventName, modelName, event) {
    if (
      eventName === models.getEventName(models.EventTypes.DELETE, modelName)
    ) {
      console.debug('deleting from cache', modelName, event.modelId)
      await datasources.getDataSource(modelName).delete(event.modelId)
      return true
    }
    return false
  }

  /**
   * Unmarshal deserialized JSON object.
   * Checks if model is an array or object
   * @param {import("./model").Model|Array<import("./model").Model>} model
   * @param {import("./datasource").default} datasource
   * @param {string} modelName
   * @returns {import("./model").Model|import("./model").Model[]>}
   */
  function hydrateModel (model, datasource, modelName) {
    if (Array.isArray(model)) {
      return model.map(m =>
        models.loadModel(observer, datasource, m, modelName)
      )
    }
    return models.loadModel(observer, datasource, model, modelName)
  }

  /**
   * Save model to cache.
   * Checks if model is an array or objec
   * @param {import(".").Model}} model
   * @param {import("./datasource").default} datasource
   * @param {function(m)=>m.id} return id to save
   */
  async function saveModel (model, datasource, id = m => m.id) {
    console.debug('saving model(s)')
    if (Array.isArray(model))
      await Promise.all(model.map(async m => datasource.save(id(m), m)))
    await datasource.save(id(model), model)
  }

  /**
   * Fetch {@link ModelSpecification} modules for `modelName` from repo.
   * @param {string} modelName
   */
  async function streamRemoteModules (modelName) {
    if (!models.getModelSpec(modelName)) {
      console.debug("we don't, import it...")
      // Stream the code for the model
      await importRemoteCache(modelName)
    }
  }

  /**
   * Returns the callback run by the external event service.
   *
   * @param {function(string):string} parser
   * @param {function(object)} route what to do after updating
   * @returns {function(message):Promise<void>}
   */
  function updateCache (route) {
    return async function (message) {
      try {
        const event = parse(message)
        const { eventName, modelName, model, modelId } = event
        console.debug('handle cache event', eventName)

        if (!model) {
          console.error('no model found', eventName)
          // no model found
          if (route) await route(event)
          return
        }

        if (await handleDelete(eventName, modelName, event)) return

        console.debug('check if we have the code for this object...')
        await streamRemoteModules(modelName)

        console.debug('unmarshal deserialized model(s)', modelName, modelId)
        const datasource = datasources.getDataSource(modelName, true)
        const hydratedModel = hydrateModel(model, datasource, modelName)
        await saveModel(hydratedModel, datasource, m => m.getId())

        if (route) await route({ ...event, model: hydratedModel })
      } catch (error) {
        console.error(updateCache.name, error)
      }
    }
  }

  /**
   *
   * @param {Event} event
   * @returns {Promise<import(".").Model[]>}
   * @throws
   */
  async function createRelated (event) {
    return Promise.all(
      event.args.map(async arg => {
        try {
          return await models.createModel(
            observer,
            datasources.getDataSource(event.relation.modelName),
            event.relation.modelName,
            arg
          )
        } catch (error) {
          throw new Error(createRelated.name, error.message)
        }
      })
    )
  }

  /**
   * Creates new, related models if relation function is called
   * with arguments, e.g.
   * ```js
   * const customer = await order.customer(customerDetails);
   * const customers = await order.customer(cust1, cust2);
   * ```
   *
   * @param {Event} event
   * @returns {Promise<import("./model").Model | import("./model").Model[]>}
   * Updated source model (model that defines the relation)
   * @throws
   */
  async function createRelatedObject (event) {
    if (event.args.length < 1 || !event.relation || !event.modelName) {
      console.log('missing required params', event)
      return event
    }
    try {
      const related = await createRelated(event)
      const datasource = datasources.getDataSource(event.relation.modelName)
      await Promise.all(related.map(async m => datasource.save(m.getId(), m)))
      return related
    } catch (error) {
      console.error(error)
      throw new Error(createRelatedObject.name, error)
    }
  }

  /**
   *s
   * @param {Event} event
   * @param {import(".").Model|import(".").Model[]} related
   * @returns {Event} w/ updated model, modelId, modelName
   */
  function formatResponse (event, related) {
    if (!related || related.length < 1) {
      console.debug('related is null')
      return {
        ...event,
        model: null
      }
    }
    const rel = makeArray(related)

    return {
      ...event,
      model: rel.length < 2 ? rel[0] : rel,
      modelName: event.relation.modelName,
      modelId: rel[0].id || rel[0].getId()
    }
  }

  /**
   * Returns function to search the cache.
   * @param {function(string):string} parser
   * @param {function(object)} route
   * @returns {function(message):Promise<void>}
   * function that searches the cache
   */
  function searchCache (route) {
    return async function (message) {
      console.debug(searchCache.name, message)
      try {
        const event = parse(message)

        if (event.args.length > 0) {
          const newModel = await createRelatedObject(event)
          await route(formatResponse(event, newModel))
          return
        }

        // find the requested object(s)
        const related = await relationType[event.relation.type](
          event.model,
          datasources.getDataSource(event.relation.modelName),
          event.relation
        )
        await route(formatResponse(event, related))
      } catch (error) {
        console.error(searchCache.name, error)
      }
    }
  }

  /**
   * Listen for response to search request and notify requester.
   * @param {*} responseName
   * @param {*} internalName
   */
  const receiveSearchResponse = (responseName, internalName) =>
    subscribe(
      responseName,
      updateCache(async event => observer.notify(internalName, event))
    )

  /**
   * Listen for search request from remote system, search and send response.
   *
   * @param {*} request
   * @param {*} response
   */
  const answerSearchRequest = (request, response) =>
    subscribe(
      request,
      searchCache(async event => publish({ ...event, eventName: response }))
    )

  /**
   * Listen for internal events requesting cache search and send to remote systems.
   * @param {*} internalEvent
   * @param {*} externalEvent
   */
  const forwardSearchRequest = (internalEvent, externalEvent) =>
    observer.on(
      internalEvent,
      async event => publish({ ...event, eventName: externalEvent }),
      { matchId: true }
    )

  /**
   * Listen for events from remote systems and update local cache.
   * @param {string} eventName
   */
  const receiveCrudBroadcast = eventName =>
    subscribe(externalCrudEvent(eventName), updateCache())

  /**
   *
   * @param {string} eventName
   */
  const broadcastCrudEvent = eventName =>
    observer.on(eventName, async event =>
      publish({ ...event, eventName: externalCrudEvent(eventName) })
    )

  /**
   * Listen for events from remote systems and update local cache.
   * @param {string} eventName
   */
  // const receiveCrudSyncEvent = eventName =>
  //   subscribe(externalCrudSyncEvent(eventName), updateCache())

  /**
   * Subcribe to external CRUD events for related models.
   * Also listen for request and response events for locally
   * and remotely cached data.
   */
  function start () {
    const modelSpecs = models.getModelSpecs()
    const localModels = modelSpecs.map(m => m.modelName)
    const remoteModels = [
      ...new Set( // deduplicate
        modelSpecs
          .filter(m => m.relations) // only models with relations
          .map(m =>
            Object.keys(m.relations)
              .filter(
                // filter out existing local models
                k => !localModels.includes(m.relations[k].modelName)
              )
              .map(k => m.relations[k].modelName)
          )
          .reduce((a, b) => a.concat(b), [])
      )
    ]

    console.info('local models', localModels, 'remote models', remoteModels)

    // Forward requests to, handle responses from, remote models
    remoteModels.forEach(function (modelName) {
      // listen for internal requests and forward externally
      forwardSearchRequest(
        internalCacheRequest(modelName),
        externalCacheRequest(modelName)
      )
      // listen for external responses to forwarded requests
      receiveSearchResponse(
        externalCacheResponse(modelName),
        internalCacheResponse(modelName)
      )
      // listen for CRUD events from related, external models
      ;[
        models.getEventName(models.EventTypes.UPDATE, modelName),
        models.getEventName(models.EventTypes.CREATE, modelName),
        models.getEventName(models.EventTypes.DELETE, modelName)
      ].forEach(receiveCrudBroadcast)
    })

    // Respond to search requests and broadcast CRUD events
    localModels.forEach(function (modelName) {
      // Listen for external requests and respond with search results
      answerSearchRequest(
        externalCacheRequest(modelName),
        externalCacheResponse(modelName)
      )
      // Listen for local CRUD events and forward externally
      ;[
        models.getEventName(models.EventTypes.UPDATE, modelName),
        models.getEventName(models.EventTypes.CREATE, modelName),
        models.getEventName(models.EventTypes.DELETE, modelName)
      ].forEach(broadcastCrudEvent)

      // Listen for CRUD events from a remote instance of a local model -
      // No endless loop as we are listening for different internal events
      // ;[
      //   models.getEventName(models.EventTypes.UPDATE, modelName),
      //   models.getEventName(models.EventTypes.CREATE, modelName),
      //   models.getEventName(models.EventTypes.DELETE, modelName)
      // ].forEach(receiveCrudSyncEvent)
    })
  }

  return {
    start
  }
}

'use strict'

import { relationType } from './make-relations'
import { importRemoteCache } from '.'
import domainEvents from '../domain/domain-events'
const {
  internalCacheRequest,
  internalCacheResponse,
  externalCacheRequest,
  externalCacheResponse,
  externalCrudEvent
} = domainEvents

/**
 * @typedef {import("./model").Model} Model
 */
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
 *  broker:import("./event-broker").EventBroker,
 *  datasources:import("./datasource-factory").DataSourceFactory,
 *  models:import("./model-factory").ModelFactory,
 *  subscribe:function(string,function()),
 *  publish:function(string,object),
 * }} param0
 */
export default function DistributedCache ({
  models,
  broker,
  datasources,
  publish,
  subscribe
}) {
  /**
   * @typedef {{
   *  eventName:string,
   *  modelName:string,
   *  modelId:string,
   *  model:Model|Model[],
   *  args:[],
   *  relation:{
   *    type:string,
   *    modelName:string,
   *    foreignKey:string}
   * }} Event the unit of data for tramsmission of cached data
   */

  /** @typedef {import(".").ModelSpecification} ModelSpecification*/

  /**
   * parse {@link Event}
   * @param {Event} payload
   * @returns {Event}
   */
  function parse (payload) {
    if (!payload) {
      throw new Error({ func: parse.name, error: 'no payload included' })
    }

    try {
      const requiredFields = ['eventName', 'model']
      const actuals = Object.keys(payload)
      const missing = requiredFields.filter(k => !actuals.includes(k))

      if (missing.length > 0) {
        console.error(parse.name, 'missing fields:', missing)
        throw new Error('missing required fields', { missing })
      }

      return {
        ...payload,
        modelName: (payload.modelName || payload.model.modelName).toUpperCase(),
        modelId: payload.modelId || payload.model.id,
        args: payload.args || []
      }
    } catch (e) {
      console.error('could not parse message', e, { payload })
    }
  }

  /**
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
   * @param {Array<Model>} model
   * @param {import("./datasource").default} datasource
   * @param {string} modelName
   * @returns {Model}
   */
  function hydrateModel (model, datasource, modelName) {
    return models.loadModel(broker, datasource, model, modelName)
  }

  /**
   * Save model to cache.
   * @param {Model[]} model
   * @param {import("./datasource").default} datasource
   * @param {function(m)=>m.id} return id to save
   */
  async function saveModel (model, datasource) {
    console.debug({
      fn: saveModel.name,
      model: model.modelName,
      ds: datasource.name
    })
    return datasource.save(models.getModelId(model), model)
  }

  /**
   * Fetch {@link ModelSpecification} modules for `modelName` from repo.
   * @param {string} modelName
   */
  async function streamRemoteModules (modelName) {
    console.debug('check if we have the code for this object...')
    if (!models.getModelSpec(modelName)) {
      console.debug("we don't, import it...")
      // Stream the code for the model
      await importRemoteCache(modelName)
    }
  }

  /**
   *
   *
   * @param {function(string):string} parser
   * @param {function(object)} route what to do after updating
   * @returns {function(message):Promise<void>}
   */
  function updateCache (route) {
    return async function (message) {
      try {
        const event = parse(message)
        const { eventName, modelName, model } = event
        console.debug('handle cache event', eventName)

        if (!model || model.length < 1) {
          console.error('no model found', eventName)
          // no model found
          if (route) await route(event)
          return
        }

        if (await handleDelete(eventName, modelName, event)) return

        await streamRemoteModules(modelName)
        const datasource = datasources.getDataSource(modelName, true)
        const hydratedModel = hydrateModel(model, datasource, modelName)
        await saveModel(hydratedModel, datasource)

        if (route) await route({ ...event, model: hydratedModel })
      } catch (error) {
        console.error(updateCache.name, error)
      }
    }
  }

  /**
   *
   * @param {Event} event
   * @returns {Promise<Model>}
   * @throws
   */
  async function createRelated (event) {
    const created = await Promise.all(
      event.args.map(async arg => {
        console.debug('arg', arg)
        try {
          return await models.createModel(
            broker,
            datasources.getDataSource(event.relation.modelName),
            event.relation.modelName,
            arg
          )
        } catch (error) {
          throw new Error(createRelated.name, error.message)
        }
      })
    )
    return created[0]
  }

  /**
   * Creates new, related models if relation function is called
   * with arguments, e.g.
   * ```js
   * const customer = await order.customer(customerDetails);
   * const customers = await order.customer([cust1, cust2]);
   * ```
   *
   * @param {Event} event
   * @returns {Promise<import("./model").Model>}
   * Updated source model (model that defines the relation)
   * @throws
   */
  async function createRelatedObject (event) {
    if (event.args.length < 1 || !event.relation || !event.modelName) {
      console.error('missing required params', event)
      return null
    }

    try {
      const model = await createRelated(event)
      const datasource = datasources.getDataSource(event.relation.modelName)
      return datasource.save(model.getId(), model)
    } catch (error) {
      console.error(createRelatedObject.name, error)
      return null
    }
  }

  /**
   *s
   * @param {Event} event
   * @param {Model|Model[]} model models
   * @returns {Event} w/ updated model, modelId, modelName
   */
  function formatResponse (event, model) {
    if (!model || model.length < 1) {
      console.debug(formatResponse.name, 'no model provided')
      return {
        ...event,
        model: null
      }
    }

    return {
      ...event,
      model: Array.isArray(model)
        ? model.length < 2
          ? model[0]
          : model
        : model,
      modelId: Array.isArray(model)
        ? model[0].id || model[0].getId()
        : model.id || model.getId()
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
      console.debug(searchCache.name)

      try {
        const event = parse(message)

        // args mean create an object
        if (event.args?.length > 0) {
          const newModel = await createRelatedObject(event)
          console.debug('new model created: ', newModel)
          return await route(formatResponse(event, newModel))
        }

        console.debug(
          '###############',
          event.relation,
          datasources.getDataSource('CUSTOMER').listSync(),
          datasources.getDataSource('customer').listSync()
        )

        // find the requested object or objects
        const related = await relationType[event.relation.type](
          event.model,
          datasources.getDataSource('CUSTOMER'),
          event.relation
        )
        console.debug(searchCache.name, 'related model ', related)
        return await route(formatResponse(event, related))
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
      updateCache(async event => broker.notify(internalName, event))
    )

  /**
   * Listen for search request from remote system, search and send response.
   *
   * @param {string} request name of event received from remote instance
   * @param {string} response name of event sent in response to request
   */
  const answerSearchRequest = (request, response) =>
    subscribe(
      request,
      searchCache(event => publish({ ...event, eventName: response }))
    )

  /**
   * Listen for internal events requesting cache search and send to remote systems.
   * @param {string} internalEvent name of internal event
   * @param {string} externalEvent name of external event
   */
  const forwardSearchRequest = (internalEvent, externalEvent) =>
    broker.on(internalEvent, event =>
      publish({ ...event, eventName: externalEvent })
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
    broker.on(eventName, async event =>
      publish({ ...event, eventName: externalCrudEvent(eventName) })
    )

  /**
   * Subcribe to external CRUD events for related models.
   * Also listen for request and response events for locally
   * and remotely cached data.
   */
  function start () {
    const modelSpecs = models.getModelSpecs()
    const localModels = modelSpecs.map(m => m.modelName.toUpperCase())
    const remoteModels = [
      ...new Set( // deduplicate
        modelSpecs
          .filter(m => m.relations) // only models with relations
          .map(m =>
            Object.keys(m.relations)
              .filter(
                // filter out existing local models
                k =>
                  !localModels.includes(m.relations[k].modelName.toUpperCase())
              )
              .map(k => m.relations[k].modelName.toUpperCase())
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
      receiveSearchResponse(externalCacheResponse(modelName), 'to_worker')
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
    })
  }

  console.info('distributed object cache runnings')

  return {
    start
  }
}

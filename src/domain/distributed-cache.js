'use strict'

import { relationType } from './make-relations'
import { importRemoteCache } from '.'
import domainEvents from '../domain/domain-events'
import asyncPipe from './util/async-pipe'
import { workerData } from 'worker_threads'
import { modelsInDomain, UseCaseService } from './use-cases'
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

/**q
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
   * Unmarshal deserialized object.
   * @param {Array<Model>} model
   * @param {import("./datasource").default} datasource
   * @param {string} modelName
   * @returns {Model}
   */
  function hydrate (o) {
    const { model, datasource, modelName } = o
    return {
      ...o,
      model: model.map(m => models.loadModel(broker, datasource, m, modelName))
    }
  }

  /**
   * Save model to cache.
   * @param {Model[]} model
   * @param {import("./datasource").default} datasource
   * @param {function(m)=>m.id} return id to save
   */
  async function save (o) {
    const { model, modelName, datasource } = o

    console.debug({
      fn: save.name,
      modelName,
      ds: datasource.name
    })

    if (modelName !== datasource.name.toUpperCase()) {
      console.error('wrong dataset, aborting')
      return o
    }

    model.forEach(async m => await datasource.save(models.getModelId(m), m))
    return o
  }

  /**
   * Fetch {@link ModelSpecification} modules for `modelName` from repo.
   * @param {string} modelName
   */
  async function streamCode (o) {
    const { modelName } = o
    console.debug('check if we have the code for this object...')

    if (!models.getModelSpec(modelName.toUpperCase())) {
      console.debug("...we don't, stream it.")

      // Stream the code for the model
      await importRemoteCache(modelName.toUpperCase())
      return o
    }
    console.debug('...we do.')
    return o
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
   * Pipes functions that instantiate the remote object(s) and upsert the cache
   */
  const handleUpsert = asyncPipe(streamCode, hydrate, save)

  /**
   * Having received a response to a request,
   * update the local cache with the results
   * and invoke the `route` callback, if one
   * exists, to publish the results to other
   * registered listeners.
   *
   * @param {function(string):string} parser
   * @param {function(object)} route what to do after updating
   * @returns {function(message):Promise<void>}
   */
  function updateCache (route) {
    return async function (message) {
      try {
        const event = parse(message)
        const eventName = event.eventName
        const models = [event.model].flat()
        const [model] = models
        const modelNameUpper = model.modelName.toUpperCase()

        console.debug('handle cache event', model, eventName)
        if (!modelNameUpper) throw new Error('no model', event)

        if (!model) {
          console.error('no model found', eventName)
          // no model found
          if (route) await route(event)
          return
        }

        if (await handleDelete(eventName, modelNameUpper, event)) return

        const enrichedEvent = await handleUpsert({
          modelName: modelNameUpper,
          datasource: datasources.getDataSource(modelNameUpper),
          model: models,
          event
        })

        if (route) route(enrichedEvent)
      } catch (error) {
        console.error({ fn: updateCache.name, error })
      }
    }
  }

  /**
   *
   * @param {Event} event
   * @returns {Promise<Event>}
   * @throws
   */
  async function createModels (event) {
    const modelName = event.relation.modelName.toUpperCase()
    const service = UseCaseService(modelName)
    const models = await Promise.all(
      event.args.map(async arg => {
        return service.createModel(arg)
      })
    )
    return { ...event, model: models }
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
   * @returns {Promise<Event>}
   * Updated source model (model that defines the relation)
   * @throws
   */
  async function saveModels (event) {
    try {
      const models = event.model
      const datasource = datasources.getDataSource(
        event.relation.modelName.toUpperCase()
      )
      models.forEach(model => datasource.save(model.getId(), model))
      return event
    } catch (error) {
      console.error(saveModels.name, error)
      return event
    }
  }

  const newModels = asyncPipe(createModels, saveModels)

  /**
   * Returns function to search the cache.
   * @param {function(string):string} parser
   * @param {function(object)} route
   * @returns {function(message):Promise<void>}
   * function that searches the cache
   */
  function searchCache (route) {
    return async function (message) {
      try {
        const event = parse(message)
        const { relation, model } = event

        // args mean create an object
        if (event.args?.length > 0) {
          console.debug({
            fn: searchCache.name,
            models: event.model
          })

          return await route(await newModels(event))
        }

        // find the requested object or objects
        const relatedModels = await relationType[relation.type](
          model,
          datasources.getDataSource(relation.modelName),
          relation
        )

        console.debug({
          fn: searchCache.name,
          msg: 'related model(s)',
          related: relatedModels
        })

        return await route({
          ...event,
          model: relatedModels,
          eventTarget: requester,
          route: 'response'
        })
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

  // const fulfillDeploymentRequest = request =>
  //   subscribe(request, () =>
  //     UseCaseService(request.modelName.toUpperCase()).deployModel()
  //   )

  /**
   * Listen for search request from remote system, search and send response.
   *
   * @param {string} request name of event received from remote instance
   * @param {string} response name of event sent in response to request
   */
  const answerSearchRequest = (request, response) =>
    subscribe(
      request,
      searchCache(event =>
        publish({
          ...event,
          eventName: response,
          eventTarget: event.eventSource,
          eventSource: event.eventTarget
        })
      )
    )

  /**
   * Listen for internal events requesting cache search and forward externally.
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

  function handlecrudeEvent (modelSpecs) {}
  /**
   * Subcribe to external CRUD events for related models.
   * Also listen for request and response events for locally
   * and remotely cached data.
   */
  function listen () {
    const modelSpecs = models.getModelSpecs()
    const localModels = modelsInDomain(workerData.poolName)
    const relatedModels = [
      ...modelSpecs
        .filter(spec => spec.relations)
        .map(spec => Object.values(spec.relations))
        .flat(2)
        .map(relation => relation.modelName)
        .reduce((unique, modelName) => unique.add(modelName), new Set())
    ]

    console.debug({ relatedModels })
    const remoteRelated = relatedModels.filter(
      related => !localModels.includes(related)
    )

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

    // Forward local requests to, handle responses from, related remote models
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
      //
      ;[
        // listen for CRUD events from related, external models
        models.getEventName(models.EventTypes.UPDATE, modelName),
        models.getEventName(models.EventTypes.CREATE, modelName),
        models.getEventName(models.EventTypes.DELETE, modelName)
      ].forEach(receiveCrudBroadcast)
    })

    // Respond to external search requests and broadcast local CRUD events
    localModels.forEach(function (modelName) {
      // Listen for external requests and respond with search results
      answerSearchRequest(
        externalCacheRequest(modelName),
        externalCacheResponse(modelName)
      )

      // fulfillDeploymentRequest(
      //   externalDeploymentRequest(modelName),
      //   externalDeploymentResponse(modelName)
      // )

      // Listen for local CRUD events and forward externally
      ;[
        models.getEventName(models.EventTypes.UPDATE, modelName),
        models.getEventName(models.EventTypes.CREATE, modelName),
        models.getEventName(models.EventTypes.DELETE, modelName)
      ].forEach(broadcastCrudEvent)
    })
  }

  console.info('distributed object cache running')

  return Object.freeze({
    listen
  })
}

'use strict'
import { resolve } from 'path/posix'
import domainEvents from './domain-events'
const {
  internalCacheRequest,
  internalCacheResponse,
  externalCacheRequest
} = domainEvents

const maxwait = process.env.REMOTE_OBJECT_MAXWAIT || 6000

export const relationType = {
  /**
   *
   * @param {import("./model").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} rel
   */
  oneToMany: async (model, ds, rel) => {
    return ds.list({ [rel.foreignKey]: model.getId() })
  },
  /**
   *
   * @param {import(".").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} config
   */
  manyToOne: async (model, ds, rel) => await ds.find(model[rel.foreignKey]),
  /**
   * Assumes the model contains an array of the related ohject.
   * @param {import(".").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} config
   * @returns
   */
  containsMany: async (model, ds, rel) =>
    await Promise.allSettled(
      model[rel.key].map(key => ds.find(key[rel.foreignKey]))
    )
}

/**
 * If we create a new object, foreign keys need to reference it
 * @param {*} fromModel
 * @param {*} toModel
 * @param {*} relation
 * @param {*} ds
 */
async function updateForeignKeys (fromModel, toModel, relation, ds) {
  console.debug(updateForeignKeys.name, toModel)
  if (
    [relationType.manyToOne.name, relationType.oneToOne.name].includes(
      relation.type
    )
  ) {
    console.debug(updateForeignKeys.name, 'found', toModel)
    return fromModel.update({ [relation.foreignKey]: toModel.getId() }, false)
  } else if (
    toModel instanceof Array &&
    (relation.type === relationType.oneToMany.name ||
      relation.type === relationType.contains)
  ) {
    return Promise.allSettled(
      toModel.map(async m =>
        (await ds.find(m.id)).update({
          [relation.foreignKey]: fromModel.getId()
        })
      )
    )
  }
}

/**
 * Find existing, or create new, remote objects from
 * the distributed cache and store them in the local cache.
 *
 * Sends a request message to, and receives a response from,
 * the local cache manager.
 *
 * @param {import(".").relations[x]} relationdd
 * @param {import("./event-broker").EventBroker} broker
 * @returns {Promise<import(".").Model>} source model
 */
export function requireRemoteObject (model, relation, broker, ...args) {
  const request = internalCacheRequest(relation.modelName)
  const response = internalCacheResponse(relation.modelName)

  console.debug({ fn: requireRemoteObject.name })

  const requestData = {
    eventName: request,
    modelName: model.getName().toUpperCase(),
    eventType: externalCacheRequest.name,
    eventSource: model.getName().toUpperCase(),
    eventTarget: relation.modelName.toUpperCase(),
    modelId: model.getId(),
    relation,
    model,
    args
  }

  return new Promise(async function (resolve) {
    setTimeout(resolve, maxwait)
    broker.on(response, resolve)
    await broker.notify(request, requestData)
  })
}

/**
 * Generate functions to retrieve related domain objects.
 * @param {import("./index").relations} relations
 * @param {import("./datasource").default} datasource
 */
export default function makeRelations (relations, datasource, broker) {
  if (Object.getOwnPropertyNames(relations).length < 1) return

  return Object.keys(relations)
    .map(function (relation) {
      const rel = relations[relation]

      try {
        // relation type unknown
        if (!relationType[rel.type]) {
          console.warn('invalid relation', rel)
          return
        }

        return {
          // the relation function
          async [relation] (...args) {
            // Get the datasource of the related object
            const ds = datasource
              .getFactory()
              .getSharedDataSource(rel.modelName.toUpperCase())

            let models
            // args mean create new instance(s) of related model
            if (args?.length > 0) {
              try {
                models = createNewModels(args, this, rel, ds)
                if ((await models).length > 0) return models
              } catch (error) {
                console.warn({ error })
              }
            } else {
              models = await relationType[rel.type](this, ds, rel)
            }

            if (!models || models.length < 1) {
              // couldn't find the object locally - try remote instances
              const event = await requireRemoteObject(
                this,
                rel,
                broker,
                ...args
              )

              // each arg contains input to create a new object
              if (event?.args?.length > 0)
                updateForeignKeys(this, event, rel, ds)

              return await relationType[rel.type](this, ds, rel)
            }
            return models
          }
        }
      } catch (e) {
        console.error(e)
      }
    })
    .reduce((c, p) => ({ ...p, ...c }))
}

async function createNewModels (args, fromModel, relation, ds) {
  if (args.length > 0) {
    const { UseCaseService } = require('.')
    const service = UseCaseService(relation.modelName.toUpperCase())
    const newModels = await Promise.all(args.map(arg => service.addModel(arg)))
    updateForeignKeys(fromModel, newModels, relation, ds)
    return newModels
  }
}

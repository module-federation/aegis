'use strict'

import domainEvents from './domain-events'
const {
  internalCacheRequest,
  internalCacheResponse,
  externalCacheRequest
} = domainEvents

const maxwait = process.env.REMOTE_OBJECT_MAXWAIT || 6000

// export const localDatasources = modelName =>
//   findLocalRelatedDatasources(modelName)

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
   * @param {*} model
   * @param {*} ds
   * @param {*} rel
   * @returns
   */
  oneToOne (model, ds, rel) {
    return this.manyToOne(model, ds, rel)
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

const referentialIntegrity = {
  [relationType.manyToOne.name] (fromModel, toModels, relation, ds) {
    const dsFrom = ds.getFactory().getSharedDataSource(fromModel.getName())
    const latest = dsFrom.findSync(fromModel.getId())
    console.log({ latest })
    const update = { ...latest, [relation.foreignKey]: toModels[0].getId() }
    dsFrom.saveSync(fromModel.getId(), update)
    setTimeout(
      () =>
        dsFrom.saveSync(fromModel.getId(), {
          ...dsFrom.findSync(fromModel.getId()),
          [relation.foreignKey]: toModels[0].getId()
        }),
      1000
    )
    return update
  },

  [relationType.oneToOne.name] (fromModel, toModels, relation, ds) {
    return this[relationType.manyToOne.name](fromModel, toModels, relation, ds)
  },

  [relationType.oneToMany.name] (fromModel, toModels, relation, ds) {
    return Promise.allSettled(
      toModels.map(m => {
        const model = ds.findSync(m.id)
        ds.saveSync({
          ...model,
          [relation.foreignKey]: fromModel.getId()
        })
      })
    )
  },

  [relationType.containsMany.name] (fromModel, toModel, relation, ds) {}
}

/**
 * If we create a new object, foreign keys need to reference it
 * @param {import('./model').Model} fromModel
 * @param {import('./model').Model[]} toModels one or more models depending on the relation
 * @param {import('./index').relations[x]} relation
 * @param {import('./model-factory').Datasource} ds
 */
function updateForeignKeys (fromModel, toModels, relation, ds) {
  console.debug({ fn: updateForeignKeys.name, toModels })
  return referentialIntegrity[relation.type](fromModel, toModels, relation, ds)
}

/**
 *
 * @param {any[]} args - each arg is the input to a new model
 * @param {import('./model').Model} fromModel
 * @param {import('./index').relations[x]} relation
 * @param {import('./datasource').default} ds
 * @returns
 */
async function createNewModels (args, fromModel, relation, ds) {
  if (args.length > 0) {
    const { UseCaseService } = require('.')

    const service = UseCaseService(relation.modelName.toUpperCase())
    const newModels = await Promise.all(args.map(arg => service.addModel(arg)))
    return updateForeignKeys(fromModel, newModels, relation, ds)
  }
}

/**
 * Find existing, or create new, remote objects from
 * the distributed cache and store them in the local cache.
 *
 * Sends a request message to, and receives a response from,
 * the local cache manager.
 *
 * @param {import(".").relations[x]} relation
 * @param {import("./event-broker").EventBroker} broker
 * @returns {Promise<import(".").Event>} source model
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

function isRelatedModelLocal (relation) {
  require('.')
    .default.getModelSpecs()
    .filter(spec => !spec.isCached)
    .map(spec => spec.modelName.toUpperCase())
    .includes(relation.modelName.toUpperCase())
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
            // Get or create datasource of related object w/ thread-local mem
            const ds = datasource.getFactory().getDataSource(rel.modelName)

            // args meancreate new local model instances
            if (args?.length > 0 && isRelatedModelLocal(rel)) {
              // args mean create new instance(s) of related model
              return await createNewModels(args, this, rel, ds)
            }

            const models = await relationType[rel.type](this, ds, rel)

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
                updateForeignKeys(this, event.model, rel, ds)

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

'use strict'

/**
 * @typedef {import('./datasource').default} DataSource
 */

import domainEvents from './domain-events'
import { importRemoteCache } from './import-remotes'

const {
  internalCacheRequest,
  internalCacheResponse,
  externalCacheRequest
} = domainEvents

const maxwait = process.env.REMOTE_OBJECT_MAXWAIT || 6000

export const relationType = {
  /**
   * Search memory and external storage
   * @param {import("./model").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} rel
   * @returns {Promise<import('./index').datasource[]>}
   */
  oneToMany: async (model, ds, rel) => {
    const filter = { [rel.foreignKey]: model.getId() }
    // retrieve from memory
    const memory = ds.listSync(filter)
    // call datasource interface to fetch from external storage
    const externalMedia = await ds.list({ query: filter })
    // return all
    if (memory.length > 0)
      return externalMedia
        .filter(ext => !memory.find(mem => mem.equals(ext)))
        .concat(memory)
    return externalMedia
  },

  /**
   * Search memory first, then external storage if not found.
   * @param {import(".").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} config
   * @returns {Promise<import('./index').datasource>}
   */
  manyToOne: async (model, ds, rel) => {
    // search memory first
    const memory = ds.findSync(model[rel.foreignKey])
    // return if found
    if (memory) return memory
    // if not, call ds interface to search external storage
    return ds.find({ id: model[rel.foreignKey] })
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
   * retrieve embedded documents from array
   *
   * @param {*} model
   * @param {*} ds
   * @param {*} rel
   * @returns
   */
  containsMany: (model, ds, rel) =>
    Promise.all(
      model[rel.arrayKey].map(arrayItem => ds.find(arrayItem[rel.foreignKey]))
    ),

  /**
   *
   * @param {import('.').Model} model
   * @param {import('.').datasource} ds
   * @param {*} rel
   * @param {*} args
   * @returns
   */
  custom: (model, ds, rel, args) => {
    // use restricted datasources, i.e. no access to DataSourceFactory
    const rds = ds.factory.getRestrictedDataSource(model.modelName)
    const relRds = ds.factory.getRestrictedDataSource(rel.modelName, {
      isCached: true,
      ephemeral: true
    })

    // if relRds is in the same domain but is remote, this fails
    if (rds.namespace !== relRds.namespace) return null

    return rds[rel.name]({ args, model, ds: relRds, relation: rel })
  }
}

/**
 * If we create a new related object, foreign keys need to reference it.
 */
const updateForeignKeys = {
  /**
   *
   * @param {import('./model').Model} fromModel
   * @param {import('./model').Model[]} toModels one or more models depending on the relation
   * @param {import('./index').relations[x]} relation
   * @param {import('./model-factory').Datasource} ds
   */
  async [relationType.manyToOne.name] (fromModel, toModels, relation, ds) {
    return fromModel.update(
      { [relation.foreignKey]: toModels[0].getId() },
      false
    )
  },

  async [relationType.oneToOne.name] (fromModel, toModels, relation, ds) {
    return this[relationType.manyToOne.name](fromModel, toModels, relation, ds)
  },

  async [relationType.oneToMany.name] (fromModel, toModels, relation, ds) {
    return Promise.all(
      toModels.map(async m => {
        const model = await ds.find(m.id || m.getId())
        return ds.save(m.id, {
          ...model,
          [relation.foreignKey]: fromModel.getId()
        })
      })
    )
  },

  async [relationType.containsMany.name] (fromModel, toModels, relation, ds) {
    toModels.map(model =>
      model.update({ [relation.foreignKey]: fromModel.getId() })
    )
  },

  async [relationType.custom.name] (fromModel, toModels, relation, ds) {
    const customFn = fromModel[`${relation}UpdateForeignKeys`]
    if (customFn === 'function') customFn(toModels, relation, ds)
  }
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
    const { UseCaseService, importRemoteCache } = require('.')
    const service = UseCaseService(relation.modelName.toUpperCase())
    const newModels = await Promise.all(
      args.map(arg => service.createModel(arg))
    )
    return updateForeignKeys[relation.type](fromModel, newModels, relation, ds)
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

  console.debug({ fn: requireRemoteObject.name, relation })

  const name = (model ? model.getName() : relation.modelName).toUpperCase()
  const id = model ? model.getId() : relation.id
  const eventSource = name
  const eventTarget = model ? relation.modelName.toUpperCase() : null

  const requestData = {
    eventName: request,
    modelName: name,
    eventType: externalCacheRequest.name,
    eventSource,
    eventTarget,
    modelId: id,
    relation,
    model,
    args
  }

  return new Promise(async function (resolve) {
    setTimeout(resolve, maxwait)
    broker.on(response, resolve)
    broker.notify(request, requestData)
  })
}

/**
 * Find out if a related model runs locally.
 *
 * @param {import('.').relations[x]} relation
 * @returns {boolean}
 */
function isRelatedModelLocal (relation) {
  return require('.')
    .default.getModelSpecs()
    .filter(spec => !spec.isCached)
    .map(spec => spec.modelName)
    .includes(relation.modelName)
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
      const rel = {
        ...relations[relation],
        modelName: relations[relation].modelName.toUpperCase(),
        name: relation
      }

      try {
        // relation type unknown
        if (!relationType[rel.type]) {
          console.warn('invalid relation', rel)
          return
        }

        return {
          // the relation function
          async [relation] (...args) {
            // Get existing (or create temp) datasource of related object
            const local = isRelatedModelLocal(rel)
            const createNew = args?.length > 0

            if (!local) {
              // the ds is for a remote object, fetch the code for it.
              await importRemoteCache(rel.modelName)
            } else if (createNew && rel.type !== 'custom') {
              // fetch the local ds and create the models
              const ds = datasource.factory.getDataSource(rel.modelName)
              return await createNewModels(args, this, rel, ds)
            }

            // if the object is remote, we now have its code
            const ds = datasource.factory.getDataSource(rel.modelName)

            const models = await relationType[rel.type](this, ds, rel, args)

            if (!models || models.length < 1) {
              // find remote instance(s)
              const event = await requireRemoteObject(
                this,
                rel,
                broker,
                ...args
              )

              if (createNew)
                updateForeignKeys[rel.type](this, event.model, rel, ds)

              return await relationType[rel.type](this, ds, rel, args)
            }

            return models
          }
        }
      } catch (error) {
        console.error({ fn: makeRelations.name, error })
      }
    })
    .reduce((c, p) => ({ ...p, ...c }))
}

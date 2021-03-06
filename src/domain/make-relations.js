"use strict";

import domainEvents from "./domain-events";

const maxwait = process.env.REMOTE_OBJECT_MAXWAIT || 10000;

export const relationType = {
  /**
   * @todo implement cache miss for distributed cache
   *
   * @param {import("./model").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} rel
   */
  oneToMany: async (model, ds, rel) => {
    const pk = model.id || model.getId();
    return ds.list({ [rel.foreignKey]: pk });
  },
  /**
   *
   * @param {import(".").Model} model
   * @param {import("./datasource").default} ds
   * @param {import("./index").relations[relation]} config
   */
  manyToOne: async (model, ds, rel) => await ds.find(model[rel.foreignKey]),
  /**
   *
   * @param {*} model
   * @param {*} ds
   * @param {*} rel
   */
  oneToOne(model, ds, rel) {
    return this.manyToOne(model, ds, rel);
  },
};

/**
 * If we create a new object, foreign keys need to reference it
 * @param {*} model
 * @param {*} event
 * @param {*} relation
 * @param {*} ds
 */
async function updateForeignKeys(model, event, relation, ds) {
  if (
    [relationType.manyToOne.name, relationType.oneToOne.name].includes(
      relation.type
    )
  ) {
    await model.update({ [relation.foreignKey]: event.modelId }, false);
  } else if (
    relation.type === relationType.oneToMany.name &&
    model instanceof Array
  ) {
    await Promise.all(
      event.model.map(async m =>
        (await ds.find(m.id)).update({ [relation.foreignKey]: model.modelId })
      )
    );
  }
}

/**
 * Find an existing, or create a new, remote object from
 * the distributed cache and store it in the local cache.
 *
 * Sends a request message to, and receives a response from, the cache manager.
 *
 * @param {import(".").relations[x]} relation
 * @param {import("./observer").Observer} observer
 * @returns {Promise<import(".").Model>} source model
 */
export function requireRemoteObject(model, relation, observer, ...args) {
  const request = domainEvents.internalCacheRequest(relation.modelName);
  const response = domainEvents.internalCacheResponse(relation.modelName);
  const execute = resolve => event => resolve(event);

  const requestData = {
    relation,
    eventName: request,
    modelName: model.getName(),
    modelId: model.getId(),
    model,
    args,
  };

  return new Promise(async function (resolve) {
    setTimeout(resolve, maxwait);
    observer.on(response, execute(resolve));
    await observer.notify(request, requestData);
  });
}

/**
 * Generate functions to retrieve related domain objects.
 * @param {import("./index").relations} relations
 * @param {import("./datasource").default} datasource
 */
export default function makeRelations(relations, datasource, observer) {
  if (Object.getOwnPropertyNames(relations).length < 1) return;

  return Object.keys(relations)
    .map(function (relation) {
      const rel = relations[relation];

      try {
        // relation type unknown
        if (!relationType[rel.type]) {
          console.warn("invalid relation", rel);
          return;
        }

        return {
          // the relation function
          async [relation](...args) {
            // Get the datasource of the related object
            // specify cache-only in case the object is remote
            const ds = datasource
              .getFactory()
              .getDataSource(rel.modelName, true);

            const model = await relationType[rel.type](this, ds, rel);

            if (!model || model.length < 1) {
              // couldn't find the object locally - try remote instances
              const event = await requireRemoteObject(
                this,
                rel,
                observer,
                ...args
              );

              // each arg contains input to create a new object
              if (event && event.args.length > 0) {
                await updateForeignKeys(this, event, rel, ds);
              }

              return relationType[rel.type](this, ds, rel);
            }
            return model;
          },
        };
      } catch (e) {
        console.error(e);
      }
    })
    .reduce((c, p) => ({ ...p, ...c }));
}

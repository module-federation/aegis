'use strict'

import async from '../util/async-error'

/**
 * @param {import("./model").Model} model
 * @param {import('../model').} relation
 */
export default async function fetchRelatedModels (model, relation) {
  const spec = model.getSpec()

  if (relation && spec.relations && spec.relations[relation]) {
    const result = await async(model[relation]())

    if (result.ok) {
      return { [model.getName()]: model, [relation.toUpperCase()]: result.data }
    }
  }

  return model
}

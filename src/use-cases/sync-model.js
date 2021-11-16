'use strict'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../domain/model-factory').ModelFactory} models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/observer').Observer} observer
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} editModel
 * @param {ModelParam} param0
 * @returns {function():Promise<import("../domain/model").Model>}
 */
export default function makeSyncModel ({ modelName, models, repository } = {}) {
  /**
   * This function does not generate an event and there is no validation.
   * Its a silent update received from the distributed cache allowing
   * multiple models of the same class to run on different aegis instances
   * and stay in sync. There's no valiation because it already occurred on
   * the remote instance. Retrieve the existing model and merge the change.
   * If there is no existing model, create one.
   *
   * @param {*} id
   * @param {*} changes
   * @param {*} command
   * @returns
   */
  return async function syncModel (id, changes) {
    const model = await repository.find(id)

    if (!model) {
      try {
        const newModel = models.loadModel(changes)
        repository.save(newModel.getId(), newModel)
      } catch (e) {
        console.error('could not create synced model', e)
      }
    }

    if (model.appInstanceId === changes.appInstanceId) {
      console.warn('received sync from local app instance')
      return
    }

    const dehydratedLocal = JSON.parse(JSON.stringify(model))
    const dehydratedChanges = JSON.parse(JSON.stringify(changes))
    const mergedModel = { ...dehydratedLocal, ...dehydratedChanges }
    try {
      return await repository.save(id, models.loadModel(mergedModel), false)
    } catch (error) {
      console.error(error)
    }
  }
}

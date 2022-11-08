'use strict'

import { isMainThread } from 'worker_threads'
import { AppError } from '../util/app-error'

/**
 * @typedef {Object} ModelParam
 * @property {String} modelName
 * @property {import('../model-factory').ModelFactory models
 * @property {import('../datasources/datasource').default} repository
 * @property {import('../domain/event-broker').EventBroker} broker
 * @property {Function[]} handlers
 */

/**
 * @typedef {function(ModelParam):Promise<import("../domain").Model>} invokePort
 * @param {ModelParam} param0
 * @returns {function():Promise<im`port("../domain/model").Model>}
 */
export default function makeInvokePort ({
  broker,
  repository,
  threadpool,
  modelName,
  models,
  context,
  authorize = async x => await x()
} = {}) {
  async function findModelService (id = null) {
    if (id) return repository.find(id)
    return models.getService(modelName, repository, broker)
  }
  /**
   *
   * @param {{id:string,model:import('..').Model,args:string[],port:string}} input
   * @returns
   */
  return async function invokePort (input) {
    if (isMainThread) {
      return threadpool.runJob(invokePort.name, input, modelName)
    } else {
      try {
        const { id = null, port = null} = input;
        const service = await findModelService(id)
        if (!service) {
          throw new Error('could not find service')
        } 

        if(!port) {
          const specPorts = service.getPorts();
          const path = context['requestContext'].getStore().get('path');
          console.log("PATH::::", path);
          console.log("SPEC_PORTS::::", specPorts)
          console.log("SPEC_PORT_ENTRIES:::", Object.entries(specPorts));

          const portTupleWithCustomPath = Object.entries(specPorts).filter((port) => port[1].path === path);
          console.log("PORT_TUPLE::::", portTupleWithCustomPath)


          if(!portTupleWithCustomPath) {
            throw new Error('no port specified');
          }
          if(!service[portTupleWithCustomPath[0]]) {
            throw new Error('no port found');
          }
          return await service[portTupleWithCustomPath[0]](input);
        }

        return await service[port](input)
      } catch (error) {
        return AppError(error)
      }
    }
  }
}
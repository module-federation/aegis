'use strict'

import checkAcl from '../util/check-acl'
import async from '../util/async-error'
import domainEvents from '../domain-events'
import { isMainThread } from 'worker_threads'
import ThreadPoolFactory from '../thread-pool'

const commandType = {
  /**
   *
   * @param {function(import("../domain/model").Model)} command
   * @param {import("../domain/model").Model} model
   */
  function: async (command, model) => command(model),
  /**
   *
   * @param {string} command
   * @param {import("../model").Model} model
   */
  string: async (command, model) => model[command]()
}

function commandAuthorized (spec, command, permission) {
  return (
    command &&
    spec.commands &&
    spec.commands[command] &&
    checkAcl(spec.commands[command].acl, permission)
  )
}

/**
 *
 * @param {import("../model").Model} model
 * @param {command:string} command - name of command
 * @param {string} permission - permission of caller
 */
export default async function executeCommand (model, command, permission) {
  const spec = model.getSpec()

  if (isMainThread) {
    const result = ThreadPoolFactory.getThreadPool(spec.modelName).runTask(
      executeCommand.name,
      { command, permission }
    )
    return result
  }

  if (commandAuthorized(spec, command, permission)) {
    const cmd = spec.commands[command].command

    if (typeof cmd === 'function' || model[cmd]) {
      const result = await async(commandType[typeof cmd](cmd, model))

      if (result.ok) {
        return { ...model, ...result.data }
      }
    } else {
      console.warn('command not found', command)
    }
  } else {
    model.emit(domainEvents.unauthorizedCommand(model.getName()), command, true)
  }

  return model
}
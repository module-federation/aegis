'use strict'

import checkAcl from '../util/check-acl'
import async from '../util/async-error'
import domainEvents from '../domain-events'

const { unauthorizedCommand, unknownCommand } = domainEvents

/** @typedef {import("../model").Model} Model */
/** @typedef {import('../index').ModelSpecification} ModelSpecification */

const commandType = {
  /**
   * Call a function specified in `commands`
   * section of the {@link ModelSpecification}
   * @param {function(Model)} command
   * @param {Model} model
   */
  function: async (command, model) => command(model),
  /**
   * Call a {@link Model} method
   * @param {string} command
   * @param {Model} model
   */
  string: async (command, model) => model[command]()
}

function commandAuthorized (spec, command, permission) {
  return (
    command &&
    spec.commands &&
    spec.commands[command] &&
    !spec.commands[command].disabled &&
    checkAcl(spec.commands[command].acl, permission)
  )
}

/**
 * Execute any of the {@link Model}'s methods or any in-lined
 * or referenced function specified in the `commands` section
 * of the {@link ModelSpecification}.
 *
 * @param {Model} model
 * @param {command:string} command - name of command
 * @param {string} permission - permission of caller
 */
export default async function executeCommand (
  model,
  command,
  args = {},
  permission
) {
  const spec = model.getSpec()

  console.debug('executing command:', command)

  if (commandAuthorized(spec, command, permission)) {
    const cmd = spec.commands[command].command

    if (typeof cmd === 'function' || model[cmd]) {
      const result = await async(
        commandType[typeof cmd](cmd, { ...model, ...args })
      )

      if (result.ok) {
        return { ...model, ...result.data }
      }
    } else {
      model.emit(unknownCommand, command.toString())
    }
  } else {
    model.emit(unauthorizedCommand(model.getName()), command)
  }

  return model
}

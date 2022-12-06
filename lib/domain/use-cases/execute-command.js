'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = executeCommand;
var _checkAcl = _interopRequireDefault(require("../util/check-acl"));
var _asyncError = _interopRequireDefault(require("../util/async-error"));
var _domainEvents = _interopRequireDefault(require("../domain-events"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const {
  unauthorizedCommand,
  unknownCommand
} = _domainEvents.default;

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
};
function commandAuthorized(spec, command, permission) {
  return command && spec.commands && spec.commands[command] && !spec.commands[command].disabled && (0, _checkAcl.default)(spec.commands[command].acl, permission);
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
async function executeCommand(model, command, permission) {
  const spec = model.getSpec();
  console.debug('executing command:', command);
  if (commandAuthorized(spec, command, permission)) {
    const cmd = spec.commands[command].command;
    if (typeof cmd === 'function' || model[cmd]) {
      const result = await (0, _asyncError.default)(commandType[typeof cmd](cmd, model));
      if (result.ok) {
        return {
          ...model,
          ...result.data
        };
      }
    } else {
      model.emit(unknownCommand, command.toString());
    }
  } else {
    model.emit(unauthorizedCommand(model.getName()), command);
  }
  return model;
}
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FederationMixin = void 0;
var _ = require(".");
var _makeRelations = require("./make-relations");
const FederationMixin = superclass => class extends superclass {
  /**
   * Deserialize
   * @override
   * @param {*} id
   * @returns {import('.').Model}
   */
  async find(id) {
    try {
      const result = await super.find(id);
      if (!result || result.length < 1) return this.findRemote(id);
      return result;
    } catch (error) {
      console.error({
        fn: 'federatedFindById',
        error
      });
    }
  }
  async findRemote(id) {
    const event = await (0, _makeRelations.requireRemoteObject)(null, {
      type: 'findById',
      modelName: this.name,
      id
    }, _.EventBrokerFactory.getInstance());
    if (event?.model) return event.model;
    console.debug('federated findById: no model found');
    return {};
  }
};
exports.FederationMixin = FederationMixin;
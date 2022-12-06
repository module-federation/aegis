'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DnsProvider = void 0;
const DnsProvider = {
  createRecord: async (...args) => console.log('dns.createRecord', args),
  removeRecord: async (...args) => console.log('dns.removeRecord', args)
};
exports.DnsProvider = DnsProvider;
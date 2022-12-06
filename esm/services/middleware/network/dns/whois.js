'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.whois = whois;
var _whois = require("whois");
/**
 * Lookup domain info needed for certificate requests.
 * @param {string} domain
 * @returns {Promise<{data:string,getEmail:function():string}>}
 */
async function whois(domain) {
  return new Promise(async function (resolve) {
    (0, _whois.lookup)(domain, function (_err, data) {
      resolve({
        data,
        getEmail: () => data.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)[0]
      });
    });
  });
}
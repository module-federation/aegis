"use strict";

const argv = require("node:process");
const service = require("whois");

export default async function whois(domain) {
  return new Promise(async function (resolve) {
    service.lookup(domain, function (_err, data) {
      resolve({
        data,
        getEmail: () =>
          data.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)[0],
      });
    });
  });
}

whois(argv[2]).then(data => console.log(data));

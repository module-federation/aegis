"use strict";

import service from "whois";

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

whois("module-federation.org").then(data => console.log(data.getEmail()));

"use strict";

const pkg = require("../../package.json");
import whois from "../services/whois.js";

export function provisonCert(_service) {
  return async function (options) {
    const {
      model,
      args: [callback],
    } = options;

    const Greenlock = require("greenlock");
    const greenlock = Greenlock.create({
      // used for the ACME client User-Agent string as per RFC 8555 and RFC 7231
      packageAgent: pkg.name + "/" + pkg.version,

      // used as the contact for critical bug and security notices
      // you need to have purchased the domain before this point
      maintainerEmail: (await whois(domain)).getEmail(),

      // used for logging background events and errors
      notify: function (ev, args) {
        if ("error" === ev || "warning" === ev) {
          console.error(ev, args);
          return;
        }
        console.info(ev, args);
      },
    });

    greenlock
      .get({ servername: model.domain })
      .then(async function (result) {
        if (!result) {
          // certificate is not on the approved list
          return null;
        }

        const fullchain = result.pems.cert + "\n" + result.pems.chain + "\n";
        const privkey = result.pems.privkey;

        await callback(options, { privkey, fullchain });
      })
      .catch(function (e) {
        // something went wrong in the renew process
        console.error(e);
      });
  }
}
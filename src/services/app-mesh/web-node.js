/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
"use strict";

const WebSocket = require("ws");
const dns = require("dns/promises");

let fqdn = process.env.WEBSWITCH_SERVER || "switch.app-mesh.net";
let port =
  process.env.WEBSWITCH_PORT = /true/i.test(process.env.SSL_ENABLED)
    ? process.env.SSL_PORT
    : process.env.PORT;

/** @type import("ws/lib/websocket") */
let ws;
let hostAddress;
let uplinkCallback;

async function dnsResolve(hostname) {
  const rrtype = await dns.resolveCname(hostname);
  const address = rrtype.find(record => record.address);
  if (address) return address;
  // try local override /etc/hosts
  return dns.lookup(hostname);
}

async function getHostAddress(hostname) {
  try {
    const address = await dnsResolve(hostname);
    console.info("host address", address);
    return address;
  } catch (error) {
    console.warn("dns lookup", error);
  }
}

/**
 * Set callback for uplink.
 * @param {*} callback
 */
exports.onMessage = function (callback) {
  uplinkCallback = callback;
};

/** server sets uplink host */
exports.setDestinationHost = function (host, servicePort = port) {
  hostAddress = null;
  fqdn = host;
  port = servicePort;
};

exports.resetHost = function () {
  hostAddress = null;
};

/**
 * Call this method to broadcast a message on the appmesh network
 * @param {*} event 
 * @param {import('../../domain/observer').Observer} observer 
 * @returns 
 */
exports.publishEvent = async function (event, observer) {
  if (!event) return;
  if (!hostAddress) hostAddress = await getHostAddress(fqdn);

  function publish() {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${port}`);

      ws.on("message", async function (message) {
        const eventData = JSON.parse(message);

        if (eventData.eventName) {
          await observer.notify(eventData.eventName, eventData);
        }

        if (uplinkCallback) uplinkCallback(message);
      });

      ws.on("open", function () {
        ws.send(JSON.stringify("webswitch"));
      });

      ws.on("error", function (error) {
        console.error(ws.on, error);
      });
      return;
    }

    function send() {
      if (ws.readyState) {
        ws.send(JSON.stringify(event));
        return;
      }
      setTimeout(send, 1000);
    }

    send();
  }

  try {
    publish();
  } catch (e) {
    console.warn("publishEvent", e);
  }
};

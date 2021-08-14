/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
"use strict";

const WebSocket = require("ws");
const dns = require("dns/promises");

let fqdn = process.env.WEBSWITCH_HOST || "webswitch.aegis.dev";
let port = 8062;
let path = "/webswitch/broadcast";

/**@type import("ws/lib/websocket") */
let ws;
let hostAddress;
let uplinkCallback;

async function getHostAddress(hostname) {
  try {
    const result = await dns.lookup(hostname);
    console.debug("server address", result, result.address);
    return result.address;
  } catch (error) {
    console.warn("dns lookup", error);
  }
}

/**
 * Callback invoked when , invoke server callback.
 * @param {*} callback
 */
exports.onMessage = function (callback) {
  uplinkCallback = callback;
};

/** server sets uplink host */
exports.setUplinkHost = function (host, servicePort = port) {
  hostAddress = null;
  fqdn = host;
  port = servicePort;
};

exports.publishEvent = async function (event, observer) {
  if (!event) return;

  if (!hostAddress) hostAddress = await getHostAddress(fqdn);

  function webswitch() {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${port}${path}`);

      ws.on("message", async function (message) {
        const eventData = JSON.parse(message);
        if (eventData.eventName) {
          await observer.notify(eventData.eventName, eventData);
          return;
        }
        if (uplinkCallback) uplinkCallback(message);
        console.warn("eventName or observer missing", message);
      });

      ws.on("open", function () {
        ws.send(JSON.stringify("webswitch"));
      });

      ws.on("error", function (error) {
        console.error("webswitchClient.on(error)", error);
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
    webswitch();
  } catch (e) {
    console.warn(publishEvent.name, e.message);
  }
};

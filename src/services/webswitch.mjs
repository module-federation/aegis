// export default async (event, observer) => {
//   try {
//     const publishEvent = (await import("microservices/webswitch")).publishEvent;
//     publishEvent(event, observer);
//   } catch (error) {
//     console.error(error);
//   }
// };

/**
 * WEBSWITCH (c)
 * websocket clients connect to a common server,
 * which broadcasts any messages it receives.
 */
"use strict";

import WebSocket from "ws";
import dns from "dns/promises";

const FQDN = process.env.WEBSWITCH_HOST || "webswitch.aegis.dev";
const PORT = 8062;
const PATH = "/webswitch/broadcast";

async function getHostAddress(hostname) {
  try {
    const result = await dns.lookup(hostname);
    console.debug("server address", result, result.address);
    return result.address;
  } catch (error) {
    console.warn("dns lookup", error);
  }
  return "localhost";
}

/**@type import("ws/lib/websocket") */
let ws;
let hostAddress;

export default async function publishEvent(event, observer) {
  if (!event) return;

  if (!hostAddress) hostAddress = await getHostAddress(FQDN);

  function webswitch() {
    if (!ws) {
      ws = new WebSocket(`ws://${hostAddress}:${PORT}${PATH}`);

      ws.on("message", async function (message) {
        const eventData = JSON.parse(message);
        if (eventData.eventName && observer) {
          await observer.notify(eventData.eventName, eventData);
          return;
        }
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
      const serializedEvent = JSON.stringify(event);
      if (ws.readyState) {
        ws.send(serializedEvent);
        return;
      }
      setTimeout(() => send(), 1000);
    }

    send();
  }

  try {
    webswitch();
  } catch (e) {
    console.warn(publishEvent.name, e.message);
  }
}

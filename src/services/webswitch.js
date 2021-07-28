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

async function getHostName(hostname) {
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
let hostname;

export default async function publishEvent(event, observer) {
  if (!event) return;

  if (!hostname) hostname = await getHostName(FQDN);

  function webswitch() {
    console.debug("webswitch sending", event);

    if (!ws) {
      ws = new WebSocket(`ws://${hostname}:${PORT}${PATH}`);

      ws.on("message", function (message) {
        const event = JSON.parse(message);
        if (event.eventName && observer) {
          observer.notify(event.eventName, event);
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

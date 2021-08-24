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

/** @type {import("ws/lib/websocket")} */
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
 * @extends {import("ws/lib/websocket")}
 */
class WebNode extends WebSocket {
  constructor(url, options) {
    super(url, options);

    this.on("message", async function (message) {
      const eventData = JSON.parse(message);

      if (eventData.eventName) {
        await observer.notify(eventData.eventName, eventData);
      }

      if (this.uplink) this.emit(message);
    });

    this.on("open", function () {
      this.send(JSON.stringify("webswitch"));
    });

    this.on("error", function (error) {
      console.error(this.on, error);
    });
  }

  /**
   * Register callback for uplink to handle messagess
   * from the uplink switch node.
   * @param {(msg)=>void} uplinkCallback 
   */
  onMessage(uplinkCallback) {
    this.addEventListener("message", uplinkCallback);
  }

  /** server sets uplink host */
  setDestinationHost(host, servicePort = port) {
    hostAddress = null;
    fqdn = host;
    port = servicePort;
  }

  resetDestinationHost() {
    hostAddress = null;
  };

  rateLimitExceeded() {
    if (this.limit) {
      if (this.limitCounter >= this.limit) {
        if (this.burstCounter >= this.burst) {
          console.warn("rate limit exceeded");
        }
        this.burstCounter++;
        return setTimeout(() => {
          verify(callingMethod, ...args)
          setTimeout(() => this.burstCounter--, this.burstTime)
        }, client.burstDelay)
      }
      this.limitCounter++;
    } else {
      this.limit = RATELIMIT;
      this.burst = BURSTLIMIT;
      this.limitCounter = 0;
      this.burstCounter = 0;
    }
  }

  publishEvent(event) {
    this.publish = function () {
      if (this.readyState) {
        this.send(JSON.stringify(event));
        return;
      }
      setTimeout(this.publish, 1000);
    }.bind(this);

    this.publish();
  }
}

module.exports.getWebNode = async function () {
  if (!hostAddress) hostAddress = await getHostAddress(fqdn);
  if (!ws) {
    ws = new WebNode(`ws://${hostAddress}:${port}`);
  }
  return ws;
}


// /**
//  * Set callback for uplink.
//  * @param {*} callback
//  */
// exports.onMessage = function (callback) {
//   uplinkCallback = callback;
// };

// /** server sets uplink host */
// exports.setUplinkHost = function (host, servicePort = port) {
//   hostAddress = null;
//   fqdn = host;
//   port = servicePort;
// };

// exports.resetHost = function () {
//   hostAddress = null;
// };

// exports.publishEvent = async function (event, observer) {
//   if (!event) return;

//   if (!hostAddress) hostAddress = await getHostAddress(fqdn);

//   function webswitch() {
//     if (!ws) {
//       ws = new WebSocket(`ws://${hostAddress}:${port}`);

//       ws.on("message", async function (message) {
//         const eventData = JSON.parse(message);

//         if (eventData.eventName) {
//           await observer.notify(eventData.eventName, eventData);
//         }

//         if (uplinkCallback) uplinkCallback(message);
//       });

//       ws.on("open", function () {
//         ws.send(JSON.stringify("webswitch"));
//       });

//       ws.on("error", function (error) {
//         console.error(ws.on, error);
//       });
//       return;
//     }

//     function send() {
//       if (ws.readyState) {
//         ws.send(JSON.stringify(event));
//         return;
//       }
//       setTimeout(send, 1000);
//     }

//     send();
//   }

//   try {
//     webswitch();
//   } catch (e) {
//     console.warn("publishEvent", e);
//   }
// };

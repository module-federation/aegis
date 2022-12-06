'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachServer = attachServer;
var _http = require("http");
var _nanoid = require("nanoid");
var _os = require("os");
var _ws = require("ws");
const SERVICENAME = 'webswitch';
const CLIENT_MAX_ERRORS = 3;
const CLIENT_MAX_RETRIES = 10;
const startTime = Date.now();
const uptime = () => Math.round(Math.abs((Date.now() - startTime) / 1000 / 60));
const configRoot = require('../../../config').hostConfig;
const config = configRoot.services.serviceMesh.WebSwitch;
const debug = /true/i.test(config.debug) || /true/i.test(process.env.DEBUG);
const isPrimary = /true/i.test(process.env.SWITCH) || typeof process.env.SWITCH === 'undefined' && config.isSwitch;
const headers = {
  host: 'x-webswitch-host',
  role: 'x-webswitch-role',
  pid: 'x-webswitch-pid'
};
let messagesSent = 0;
let backupSwitch;

/**
 * Attach {@link ServiceMeshAdapter} to the API listener socket.
 * Listen for upgrade events from http server and switch
 * client to WebSockets protocol. Clients connecting this
 * way are using the service mesh, not the REST API. Use
 * key + cert in {@link secureCtx} for secure connection.
 * @param {https.Server|http.Server} httpServer
 * @param {tls.SecureContext} [secureCtx] if ssl enabled
 * @returns {import('ws').server}
 */
function attachServer(httpServer, secureCtx = {}) {
  const info = Symbol('webswitch');
  /**
   * list of client connections (federation hosts, browsers, etc)
   * @type {Map<string,WebSocket>}
   */
  const clients = new Map();

  /**
   * WebSocket {@link server} that may serve as the webswitch.
   */
  const server = new _ws.Server({
    ...secureCtx,
    clientTracking: false,
    server: httpServer
  });
  server.binaryType = 'arraybuffer';
  function verifySignature(signature, data) {
    return verify('sha256', Buffer.from(data), {
      key: publicKey,
      padding: constants.RSA_PKCS1_PSS_PADDING
    }, Buffer.from(signature.toString('base64'), 'base64'));
  }
  function signatureVerified(request) {
    //verifySignature(header, publicKey)
    return true;
  }

  /**
   *
   * @param {IncomingMessage} request
   * @returns
   */
  function foundHeaders(request) {
    const list = Object.values(headers);
    const node = list.filter(h => request.headers[h]).length === list.length;
    const browser = request.headers['sec-websocket-protocol'] === 'webswitch';
    const accept = node || browser;
    if (!accept) console.log('reject connection from %s: missing protocol headers', request.socket.remoteAddress);
    return accept;
  }
  function withinRateLimits(request) {
    return true;
  }
  server.shouldHandle = request => {
    return foundHeaders(request) && signatureVerified(request) && withinRateLimits(request);
  };
  server.on('upgrade', (request, socket, head) => {
    server.handleUpgrade(request, socket, head, ws => {
      server.emit('connection', ws, request);
    });
  });
  server.on('connection', function (client, request) {
    initClient(client, request);
    client.on('error', function (error) {
      client[info].errors++;
      console.error({
        fn: 'client.on(error)',
        client: client[info],
        error
      });
      if (client[info].errors > CLIENT_MAX_ERRORS) {
        console.warn('terminating client: too many errors');
        clients.delete(client[info].uniqueName);
        client.close(4500, 'too many errors');
      }
    });
    client.on('ping', () => client.pong());
    client.on('message', function (message) {
      debug && console.debug('switch received', {
        message
      });
      try {
        if (client[info].initialized) {
          handleEvent(client, message);
          return;
        }
      } catch (e) {
        console.error(client.on.name, 'on message', e);
      }
      // bad protocol
      client.close(4403, 'bad request');
      client.terminate();
      console.warn('terminated client', client[info]);
    });
    client.on('close', function (code, reason) {
      console.info({
        msg: 'client closing',
        code,
        reason: reason.toString(),
        client: client[info]
      });
      clients.delete(client[info]?.uniqueName);
      reassignBackup(client);
      broadcast(encode(statusReport()), client);
    });
  });
  function setClientInfo(client, request) {
    client[info] = {};
    client[info].id = (0, _nanoid.nanoid)();
    client[info].pid = request.headers[headers.pid] || Math.floor(Math.random() * 9999);
    client[info].host = request.headers[headers.host] || request.headers.host;
    client[info].role = request.headers[headers.role] || 'browser';
    client[info].errors = 0;
    client[info].uniqueName = client[info].host + client[info].pid;
  }
  function initClient(client, request) {
    setClientInfo(client, request);
    if (clients.has(client[info].uniqueName)) {
      console.warn('found duplicate name', client[info].uniqueName);
      const oldClient = clients.get(client[info].uniqueName);
      oldClient.close(4040, client._socket.remotePort);
      oldClient.terminate();
    }
    client[info].initialized = true;
    clients.set(client[info].uniqueName, client);
    console.info('client initialized', client[info]);

    // make switch backup?
    assignBackup(client);

    // tell client if its now a backup switch or not
    sendClient(client, encode(client[info]));
    // tell everyone about new node (ignore browsers)
    if (client[info].role === 'node') broadcast(encode(statusReport()), client);
  }
  function handleEvent(client, message) {
    const event = decode(message);
    debug && console.debug('client received', message, event);
    if (event === 'status') {
      sendStatus(client);
      // get services and util stats
      return;
    }
    if (event.eventName === 'telemetry') {
      updateTelemetry(client, event);
      return;
    }
    broadcast(message, client);
  }
  function broadcast(data, sender) {
    clients.forEach(function (client) {
      if (client[info]?.uniqueName !== sender[info]?.uniqueName) {
        debug && console.debug('sending client', client[info], decode(data));
        sendClient(client, data);
        messagesSent++;
      }
    });
    if (server.uplink && server.uplink !== sender) {
      server.uplink.publish(data);
      messagesSent++;
    }
  }
  function encode(message) {
    return Buffer.from(JSON.stringify(message));
  }
  function decode(message) {
    return JSON.parse(Buffer.from(message).toString());
  }
  function sendClient(client, message, retries = 0) {
    if (client.readyState === _ws.WebSocket.OPEN) {
      client.send(message);
      return;
    }
    if (retries.length < CLIENT_MAX_RETRIES) setTimeout(sendClient, 2000, client, message, ++retries);
  }
  function assignBackup(client) {
    if (isPrimary &&
    // is there a backup already?
    !backupSwitch &&
    // can't be a browser
    client[info] && client[info].role === 'node' && client[info].hostname !== (0, _os.hostname)()) {
      backupSwitch = client[info]?.id;
      console.info('new backup switch: ', client[info]);
    }
  }
  function reassignBackup(client) {
    if (client[info]?.id === backupSwitch) {
      for (let c of clients) {
        if (c[info]?.role === 'node' && c[info].hostname !== (0, _os.hostname)() && c[info].id !== backupSwitch) {
          backupSwitch = c[info].id;
          c[info].isBackupSwitch = true;
          return;
        }
      }
    }
  }
  function statusReport() {
    return {
      eventName: 'meshStatusReport',
      servicePlugin: SERVICENAME,
      uptimeMinutes: uptime(),
      messagesSent,
      clientsConnected: clients.size,
      uplink: server.uplink ? server.uplink.info : 'no uplink',
      isPrimarySwitch: isPrimary,
      clients: [...clients.values()].map(v => ({
        ...v[info],
        state: v.readyState
      }))
    };
  }

  /**
   *
   * @param {WebSocket} client
   */

  function sendStatus(client) {
    console.debug('sending client status');
    sendClient(client, encode(statusReport()));
  }
  function updateTelemetry(client, msg) {
    if (!client[info]) return;
    if (msg?.telemetry && client[info]) client[info].telemetry = msg.telemetry;
    if (msg?.services && client[info]) client[info].services = msg.services;
    client[info].isBackupSwitch = backupSwitch === client[info].id;
    console.log('updating telemetry', client[info]);
  }

  // try {
  //   // configure uplink
  //   if (config.uplink) {
  //     const node = require('./node')
  //     server.uplink = node
  //     node.setUplinkUrl(config.uplink)
  //     node.onUplinkMessage(msg => broadcast(msg, node))
  //     node.connect()
  //   }
  // } catch (e) {
  //   console.error('uplink', e)
  // }

  return server;
}
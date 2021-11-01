'use strict'

const mlink = require('mesh-link')
const nanoid = require('nanoid').nanoid
const begins = Date.now()
const uptime = () => Math.round(Math.abs((Date.now() - begins) / 1000 / 60))
const userConfig = require('../../../../microlib/public/aegis.config.json')
const debug =
  /true/i.test(userConfig.services.serviceMesh.MeshLink.debug) || false

const defaultCfg = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  ttl: 1000000000,
  prefix: 'aegis',
  strict: false,
  relayLimit: 1,
  relayDelay: 0,
  updateInterval: 1000
}

const cfg = userConfig.services.serviceMesh.MeshLink.config || defaultCfg

function numericHash (str) {
  let hash = 0
  let i
  let chr
  if (str.length === 0) return hash
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return Math.abs(parseInt(hash % 10000)) //keep under 0xffff
}

const sharedObjects = new Map()

/**\
 *
 * @param {*} eventData
 * @returns
 */
function createSharedObject (eventData) {
  const { eventTime, modelName } = eventData

  if (sharedObjects.has(modelName)) {
    console.debug('sharedObjects', modelName, 'exists')
    return sharedObjects.get(modelName).mid
  }
  const backup = mlink.getBackupNodes(modelName)
  const nodes = mlink.getNodeEndPoints()
  const node = backup[0] || nodes[0] || mlink.info()
  const ttl = cfg.ttl
  const so = mlink.sharedObject.create(
    {
      name: { value: modelName },
      members: { value: {} }
    },
    ttl,
    node
  )
  console.debug('created sharedObject', so, node, so.mid)
  sharedObjects.set(modelName, { eventTime, mid: so.mid, node })
  return so.mid
}

const SharedObjEvent = {
  CREATE: async eventData => {
    const mid = createSharedObject(eventData)

    return mlink.sharedObject
      .get(mid)
      .then(so => {
        so.add('members', eventData.model.getId(), {
          ...JSON.parse(JSON.stringify(eventData.model))
        })
        so.inc('total', 1)
        so.on('update', () => {})
      })
      .catch(e => console.error('mlink', e))
  },

  UPDATE: eventData =>
    mlink.sharedObject
      .get(sharedObjects.get(eventData.modelName).mid)
      .then(so =>
        so.set('members', eventData.model.getId(), {
          ...JSON.parse(JSON.stringify(eventData.model))
        })
      ),

  DELETE: async () => console.log('delete called, no-op')
}

const registerSharedObjEvents = observer =>
  observer.on(
    /^externalCrudEvent_.*/,
    async (eventName, eventData) =>
      SharedObjEvent[eventName.split('_')[1].substr(0, 6)](eventData),
    true
  )

/**
 *
 * @param {cfg} config
 * @returns
 */
async function start (config = cfg) {
  mlink
    .start(config)
    .then(() => {
      console.info('meshlink started')
    })
    .catch(error => {
      console.error(start.name, error)
    })
}

async function publish (event, observer) {
  console.debug('publish called', event.eventName, event, observer)
  const deserEvent = JSON.parse(JSON.stringify(event))
  const handlerId = numericHash(event.eventName)
  console.debug('mlink stringify', handlerId, JSON.stringify(event))
  console.debug('mlink parse', handlerId, JSON.parse(JSON.stringify(event)))

  mlink.send(handlerId, mlink.getNodeEndPoints(), deserEvent, response => {
    console.debug('response to publish ', handlerId, response)
    const eventData = JSON.parse(response)
    if (eventData?.eventName) {
      observer.notify(eventData.eventName, eventData)
    }
  })
  try {
    global.broadcast(JSON.stringify(event), {
      info: { id: 2, role: 'MeshLink', pid: process.pid }
    })
  } catch (e) {
    console.error('error calling global.broadcast', e)
  }
}

async function subscribe (eventName, callback) {
  const handlerId = numericHash(eventName)
  if (!handlerId) return // we've already registered a callback for this event
  debug && console.debug('mlink subscribe', eventName, handlerId)

  mlink.handler(handlerId, (data, cb) => {
    console.log('mlink.handler called with data', handlerId, data)
    callback(data)
    cb(data)
  })
}

function attachServer (server) {
  let messagesSent = 0
  start()
  /**
   *
   * @param {object} data
   * @param {WebSocket} sender
   */
  server.broadcast = function (data, sender) {
    server.clients.forEach(function (client) {
      if (client.OPEN && client.info.id !== sender.info.id) {
        debug && console.debug('sending client', client.info, data.toString())
        client.send(data)
        messagesSent++
      }
    })
  }

  global.broadcast = server.broadcast

  /**
   * @todo
   * @param {*} client
   */
  server.setRateLimit = function (client) {}

  server.sendStatus = function (client) {
    client.send(
      JSON.stringify({
        servicePlugin: 'MeshLink',
        uptimeMinutes: uptime(),
        messagesSent,
        clientsConnected: server.clients.size,
        meshLinkNodes: mlink.getNodeEndPoints()
      })
    )
  }

  server.on('connection', function (client) {
    client.info = { address: client._socket.address(), id: nanoid() }

    client.addListener('ping', function () {
      debug && console.debug('responding to client ping', client.info)
      client.pong(0xa)
    })

    client.on('close', function () {
      console.warn('client disconnecting', client.info)
    })

    client.on('message', function (message) {
      try {
        const msg = JSON.parse(message.toString())

        if (client.info.initialized) {
          if (msg == 'status') {
            return server.sendStatus(client)
          }
          server.broadcast(message, client)
          return
        }

        if (msg.proto === 'webswitch' && msg.pid && msg.role) {
          client.info = {
            ...client.info,
            pid: msg.pid,
            role: msg.role,
            initialized: true
          }
          console.log('client initialized', client.info)
          return
        }
      } catch (e) {
        console.error(client.on.name, 'on message', e)
      }

      client.terminate()
      console.warn('terminated client', client.info)
    })
  })
}

module.exports = { publish, subscribe, attachServer }

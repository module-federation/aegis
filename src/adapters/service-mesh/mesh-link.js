'use strict'

const { sharedObject } = require('mesh-link')
const mlink = require('mesh-link')
const path = require('path')
const userCfg = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))

const defaultCfg = {
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  prefix: 'aegis',
  strict: false,
  relayLimit: 1,
  relayDelay: 0,
  updateInterval: 1000
}

const cfg = userCfg.env.serviceMesh.MeshLink.config || defaultCfg

let started = false

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

export function uplink (config = defaultCfg) {
  console.debug('register uplink', config.uplink)
}

const sharedObjects = new Map()

/**
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

  const ttl = 10000000000
  const backup = mlink.getBackupNodes(modelName)
  const nodes = mlink.getNodeEndPoints()
  const node = backup[0] || nodes[0] || mlink.info()
  const so = mlink.sharedObject.create(
    {
      name: { value: modelName },
      members: { value: {} }
    },
    ttl,
    node
  )

  console.debug('created sharedObject', so)

  sharedObjects.set(modelName, { eventTime, mid: so.mid, node })
  return so.mid
}

const SharedObjActions = {
  CREATE: async eventData => {
    const mid = createSharedObject(eventData)
    return mlink.sharedObject
      .get(mid)
      .then(so => {
        so.add('members', eventData.model.getId(), {
          ...JSON.parse(JSON.stringify(eventData.model))
        })
        so.inc('total', 1)
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
  observer.on(/^externalCrudEvent_.*/, async (eventName, eventData) =>
    SharedObjActions[eventName.split('_')[1].substr(0, 6)](eventData)
  )

/**
 *
 * @param {cfg} config
 * @returns
 */
export async function start (config = defaultCfg, observer = null) {
  if (started) return
  started = true

  if (observer) registerSharedObjEvents(observer)

  mlink
    .start(config)
    .then(() => {
      // connect to uplink if configured
      !config.uplink || uplink(config)

      console.info('meshlink started')
    })
    .catch(error => {
      console.error(start.name, error)
    })
}

export async function publish (event, observer) {
  const handlerId = numericHash(event.eventName)
  console.debug('mlink publish', handlerId)

  start(cfg, observer).then(() => {
    return mlink.send(
      handlerId,
      mlink.getNodeEndPoints(),
      { message: JSON.stringify(event) },
      response => {
        if (response) {
          const eventData = JSON.parse(response.message)

          if (eventData?.eventName) {
            observer.notify(eventData.eventName, eventData)
          }
        }
      }
    )
  })
}

export const subscribe = async (eventName, callback, observer) => {
  const handlerId = numericHash(eventName)
  console.debug('mlink subscribe', eventName, handlerId)
  start(cfg).then(() =>
    mlink.handler(handlerId, response =>
      callback(eventName, response.message, observer)
    )
  )
}

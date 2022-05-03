'use strict'

import { BroadcastChannel, workerData } from 'worker_threads'

/** @type {BroadcastChannel}*/
let broadcastChannel

/**
 *
 * @param {*} modelName
 * @param {*} broker
 * @returns
 */
function createBroadcastChannel (modelName, broker) {
  if (broadcastChannel) return
  broadcastChannel = new BroadcastChannel(modelName)
  // notify listeners
  broadcastChannel.onmessage = msgEvent =>
    broker.notify(msgEvent.data.eventName, msgEvent.data)
}

/**
 *
 * @param {import('./event-broker').EventBroker} broker
 */
export function registerWorkerEvents (broker) {
  createBroadcastChannel(workerData.modelName, broker)
  // 
  broker.on('shutdown', signal => process.exit(signal || 0))
}



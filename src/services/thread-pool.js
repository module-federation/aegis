'use strict'

import { Worker, MessageChannel } from 'worker_threads'
import { EventBrokerSingleton } from '../domain/event-broker'
const broker = EventBrokerSingleton.getInstance()

/**
 * @typedef {object} Thread
 * @property {number} threadId
 * @property {Worker} worker
 * @property {{[x:string]:*}} metadata
 */

function setSubChannel (channel, worker) {
  const { port1, port2 } = new MessageChannel()
  worker.postMessage({ channel, port: port1 }, [port1])
  broker.channels[channel].push(port2)
}

function setSubChannels (worker) {
  setSubChannel('workflow', worker)
  setSubChannel('cache', worker)
}

/**
 * @returns {Thread}
 */
function newThread (file, workerData, metaData) {
  const worker = new Worker(file, { workerData })
  setSubChannels(worker)
  return {
    worker,
    threadId: worker.threadId,
    metaData,
    createdAt: Date.now(),
    toJSON () {
      return {
        ...this,
        createdAt: new Date(this.createdAt).toUTCString()
      }
    }
  }
}

/**
 *
 * @param {{[x:string]:string|number}} metaCriteria
 * @param {Thread} thread
 *
 */
function metaDataMatch (metaCriteria, thread) {
  return Object.keys(metaCriteria).every(k =>
    thread.metatData[k] ? metaCriteria[k] === thread.metatData[k] : true
  )
}

export class ThreadPool {
  constructor ({
    file,
    name = null,
    workerData = {},
    numThreads = 0,
    metaData = null
  } = {}) {
    this.name = name
    this.availThreads = []
    this.waitingTasks = []
    for (let i = 0; i < numThreads; i++) {
      this.availThreads.push(newThread(file, workerData, metaData))
    }
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @param {*} metaData
   * @returns {Thread}
   */
  addThread (file, workerData, metaData = null) {
    const thread = newThread(file, workerData, metaData)
    this.availThreads.push(thread)
    return thread
  }

  removeThread (threadId = null, metaCriteria = null) {
    if (this.availThreads.length > 0) {
      if (threadId || metaCriteria) {
        const threadsToRemove = this.availThreads.filter(
          t => t.threadId === threadId || metaDataMatch(metaCriteria, t)
        )
        if (threadsToRemove.length > 0) {
          console.info('terminating threads:', threadsToRemove)
          threadsToRemove.forEach(t => t.worker.terminate())
          return true
        }
        return false
      }
      const thread = this.availThreads.pop()
      console.info('terminating thread:', thread)
      thread.worker.terminate()
      return true
    }
    console.warn('no threads available')
    return false
  }

  availableThreads () {
    return this.availThreads.length
  }

  taskQueueDepth () {
    return this.waitingTasks.length
  }

  runTask (taskName, workerData) {
    if (this.availThreads.length > 0) {
      handleRequest(res, dataAsUint8Array, this.availThreads.shift())
    } else {
      this.waitingTasks.push(thread =>
        handleRequest(res, dataAsUint8Array, thread)
      )
    }
  }
}

'use strict'

import {
  Worker,
  MessageChannel,
  isMainThread,
  parentPort
} from 'worker_threads'
import { EventBrokerFactory } from './event-broker'
import domainEvents from './domain-events'

const { fromMain, fromWorker, sendToMain, sendToWorker } = domainEvents
const broker = EventBrokerFactory.getInstance()
const DEFAULT_THREADPOOL_SIZE = 1

/**
 * @typedef {object} Thread
 * @property {string} name
 * @property {number} threadId
 * @property {Worker} worker
 * @property {{[x:string]:*}} metadata
 */

export class ThreadPool {
  constructor ({
    file,
    name = null,
    workerData = {},
    numThreads = DEFAULT_THREADPOOL_SIZE,
    metadata = null
  } = {}) {
    this.name = name
    this.availThreads = []
    this.waitingTasks = []
    for (let i = 0; i < numThreads; i++) {
      this.availThreads.push(newThread(file, workerData, metadata))
    }
    console.debug('threads in pool', this.availThreads.length, numThreads)
  }

  _setSubChannel (modelName, worker) {
    const { port1, port2 } = new MessageChannel()

    if (isMainThread) {
      worker.postMessage({ port: port2, channel: modelName }, [port2])
      port1.on('message', event =>
        broker.notify(fromWorker(event.eventName), event)
      )
      broker.on(sendToWorker(modelName), event => port1.postMessage(event))
    } else {
      port2.on('message', event =>
        broker.notify(fromMain(event.eventName), event)
      )
      broker.on(sendToMain(modelName), event => port2.postMessage(event))
    }
  }

  _setSubChannels (worker) {
    _setSubChannel(this.name, worker)
    // setSubChannel(`workflow_${this.name}`, worker)
    // setSubChannel(`cache_${this.name}`, worker)
  }

  /**
   * @returns {Thread}
   */
  _newThread (file, workerData, metadata) {
    console.debug(this._newThread.name, 'creating new thread')
    const worker = new Worker(file, { workerData })
    _setSubChannels(worker)
    return {
      worker,
      threadId: worker.threadId,
      metadata,
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
   * @param {string} file
   * @param {*} workerData
   * @param {*} metadata
   * @returns {Thread}
   */
  addThread (file, workerData, metadata = null) {
    const thread = newThread(file, workerData, metadata)
    this.availThreads.push(thread)
    return thread
  }

  removeThread (name = null, threadId = null, metaCriteria = null) {
    if (this.availThreads.length > 0) {
      if (name || threadId || metaCriteria) {
        const threadsToRemove = this.availThreads.filter(
          t =>
            t.name === name ||
            t.threadId === threadId ||
            metadataMatch(metaCriteria, t)
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

  _handleRequest (taskName, taskData, thread) {
    return new Promise((resolve, reject) => {
      thread.worker.once('message', result => {
        if (this.waitingTasks.length > 0) {
          this.waitingTasks.shift()(thread)
        } else {
          this.availThreads.push(thread)
        }
        resolve(result)
      })
      thread.worker.on('error', reject)
      const event = { name: taskName, data: taskData }
      console.debug(event)
      thread.worker.postMessage(event)
    })
  }

  runTask (taskName, taskData) {
    return new Promise(async (resolve, reject) => {
      if (this.availThreads.length > 0) {
        const result = await this._handleRequest(
          taskName,
          taskData,
          this.availThreads.shift()
        )
        resolve(result)
      } else {
        this.waitingTasks.push(thread =>
          handleRequest(taskName, taskData, thread)
        )
      }
    })
  }
}

const ThreadPoolFactory = (() => {
  const threadPools = new Map()

  function createThreadPool (modelName) {
    console.debug(createThreadPool.name)

    const pool = new ThreadPool({
      file: './dist/worker.js',
      name: modelName,
      workerData: { modelName },
      numThreads: DEFAULT_THREADPOOL_SIZE
    })
    threadPools.set(modelName, pool)
    return pool
  }

  function getThreadPool (modelName) {
    if (threadPools.has(modelName)) return threadPools.get(modelName)
    return createThreadPool(modelName)
  }

  return {
    getThreadPool
  }
})()

export default ThreadPoolFactory

'use strict'

import { clear } from 'console'
import { resolve } from 'path/posix'
import { EventEmitter } from 'stream'
import {
  Worker
  // MessageChannel,
  // isMainThread,
  // parentPort
} from 'worker_threads'
import ModelFactory from '.'
// import { EventBrokerFactory } from './event-broker'
// import domainEvents from './domain-events'

// const { fromMain, fromWorker, sendToMesh, sendToWorker } = domainEvents
// const broker = EventBrokerFactory.getInstance()
const DEFAULT_THREADPOOL_SIZE = 1

// _setSubChannel (modelName, worker) {
//   const { port1, port2 } = new MessageChannel()

//   if (isMainThread) {
//     worker.postMessage({ port: port2, channel: modelName }, [port2])
//     port1.on('message', event =>
//       broker.notify(fromWorker(event.eventName), event)
//     )
//     broker.on(sendToWorker(modelName), event => port1.postMessage(event))
//   } else {
//     port2.on('message', event =>
//       broker.notify(fromMain(event.eventName), event)
//     )
//     broker.on(sendToMesh(modelName), event => port2.postMessage(event))
//   }
// }

// _setSubChannels (worker) {
//   this._setSubChannel(this.name, worker)
//   // setSubChannel(`workflow_${this.name}`, worker)
//   // setSubChannel(`cache_${this.name}`, worker)
// }
/**
 *
 * @param {{[x:string]:string|number}} metaCriteria
 * @param {Thread} thread
 *
 */
// function metadataMatch (metaCriteria, thread) {
//   return Object.keys(metaCriteria).every(k =>
//     thread.metadata[k] ? metaCriteria[k] === thread.metadata[k] : true
//   )
// }

/**
 * @typedef {object} Thread
 * @property {number} threadId
 * @property {Worker} worker
 * @property {function()} remove
 * @property {{[x:string]:*}} metadata
 */

/**
 *
 * @param {Thread} thread
 * @returns {Promise<number>}
 */
function kill (thread) {
  return new Promise(resolve => {
    thread.worker.once('exit', () => {
      console.info(
        `thread exiting - threadId ${thread.threadId} pool ${pool.name}`
      )
      resolve()
    })
    thread.worker.emit('shutdown')
  })
}

/**
 * @param {ThreadPool} pool
 * @returns {Thread}
 */
function newThread (pool, file, workerData) {
  const worker = new Worker(file, { workerData })
  return {
    pool,
    stale: false,
    worker,
    threadId: worker.threadId,
    createdAt: Date.now(),
    async stop () {
      return kill(this)
    },
    invalid () {
      return pool._invalid
    },
    toJSON () {
      return {
        ...this,
        createdAt: new Date(this.createdAt).toUTCString()
      }
    }
  }
}

async function stopWorkers (pool) {
  await Promise.all(pool.freeThreads.map(async thread => thread.stop()))
}

/**
 *
 * @param {ThreadPool} pool
 * @param {*} taskName
 * @param {*} taskData
 * @param {*} thread
 * @param {function()} cb
 * @returns {Promise<Thread>}
 */
function runInThread (pool, taskName, taskData, thread, cb) {
  return new Promise((resolve, reject) => {
    thread.worker.once('message', async result => {
      if (pool.waitingJobs.length > 0) {
        await pool.waitingJobs.shift()(thread)
      } else {
        pool.freeThreads.push(thread)
      }

      if (this.noJobsRunning()) {
        pool.emit('noJobsRunning')
      }

      if (cb) return resolve(cb(result))
      resolve(result)
    })
    thread.worker.on('error', reject)
    thread.worker.postMessage({ name: taskName, data: taskData })
  })
}

export class ThreadPool extends EventEmitter {
  constructor ({
    file,
    name = null,
    workerData = {},
    numThreads = DEFAULT_THREADPOOL_SIZE,
    waitingJobs = [],
    options = {}
  } = {}) {
    super(options)
    this.freeThreads = []
    this.waitingJobs = waitingJobs
    this.file = file
    this.name = name
    this.workerData = workerData
    this.numThreads = numThreads
    this._invalid = false

    for (let i = 0; i < numThreads; i++) {
      this.freeThreads.push(newThread(this, file, workerData))
    }
    console.debug('threads in pool', this.freeThreads.length)
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Thread}
   */
  addThread (file = this.file, workerData = this.workerData) {
    this.freeThreads.push(newThread(this, file, workerData))
  }

  invalid () {
    console.log('pool', this.name, 'invalid=', this._invalid)
    return this._invalid
  }

  invalidate () {
    console.log('invalidate pool')
    this._invalid = true
  }

  threadPoolSize () {
    return this.numThreads
  }

  jobQueueDepth () {
    return this.waitingJobs.length
  }

  getFreeThreads () {
    return this.freeThreads
  }

  noJobsRunning () {
    return this.numThreads - this.freeThreads.length === 0
  }

  status () {
    return {
      total: this.threadPoolSize(),
      waiting: this.jobQueueDepth(),
      available: this.threadPoolSize() - this.jobQueueDepth(),
      performance: this.freeThreads.map(t => t.worker.performance)
    }
  }

  async drain () {
    return new Promise((resolve, reject) => {
      if (pool.noJobsRunning()) {
        resolve()
      } else {
        const id = setTimeout(reject, 3000)
        this.once('noJobsRunning', () => {
          clearTimeout(id)
          resolve()
        })
      }
    })
  }

  runJob (jobName, jobData) {
    return new Promise(async (resolve, reject) => {
      if (!this.invalid()) {
        let thread = this.freeThreads.shift()
        if (thread) {
          const result = await runInThread(this, jobName, jobData, thread)
          resolve(result)
          return
        }
      }
      this.waitingJobs.push(thread =>
        runInThread(this, jobName, jobData, thread, result => resolve(result))
      )
    })
  }
}

let threadPools = new Map()

const ThreadPoolFactory = (() => {
  function createThreadPool (modelName, waitingJobs) {
    console.debug(createThreadPool.name)

    const pool = new ThreadPool({
      file: './dist/worker.js',
      name: modelName,
      workerData: { modelName },
      numThreads: DEFAULT_THREADPOOL_SIZE,
      waitingJobs
    })
    threadPools.set(modelName, pool)
    return pool
  }

  function listPools () {
    return [...threadPools].map(([k]) => k)
  }

  /**
   *
   * @param {*} modelName
   * @returns {ThreadPool}
   */
  function getThreadPool (modelName) {
    if (threadPools.has(modelName)) {
      const pool = threadPools.get(modelName)

      if (pool.invalid() || pool.threadPoolSize() < 1) {
        return createThreadPool(modelName, [...pool.waitingJobs])
      }

      return pool
    }
    return createThreadPool(modelName)
  }

  async function invalidateAll () {
    threadPools.forEach(pool => pool.invalidate())
  }

  async function invalidatePool (poolName) {
    const pool = threadPools.get(poolName)
    if (!pool) return false
    pool.invalidate()
    pool
      .drain()
      .then(stopWorkers)
      .catch(e => console.error(e))
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  return {
    getThreadPool,
    listPools,
    status,
    invalidatePool,
    invalidateAll
  }
})()

export default ThreadPoolFactory

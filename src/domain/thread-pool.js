'use strict'

import { EventEmitter } from 'stream'
import {
  threadId,
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
  console.info('killing thread', thread.threadId)

  const timerId = setTimeout(() => {
    thread.worker.terminate()
    console.log('terminated thread', threadId)
  }, 3000)

  return new Promise(resolve => {
    thread.worker.once('exit', () => {
      console.info(
        `exiting - threadId ${thread.threadId} pool ${thread.pool.name}`
      )
      clearTimeout(timerId)
      resolve()
    })
    thread.worker.postMessage({ name: 'shutdown' })
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

      if (pool.noJobsRunning()) {
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
    name,
    factory,
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
    this.factory = factory
    this.booted = false
    this.options = options

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

  /**@returns {boolean} */
  invalid () {
    console.log('pool', this.name, 'invalid dd=', this._invalid)
    return this._invalid
  }

  /**@returns {boolean} */
  afterboot () {
    if (!this.booted) this.booted = true
    return !this.booted ? this.preload : this.booted
  }

  /**
   * mark pool as invalid so new code is loaded
   * @returns {Thread} for chaining
   */
  invalidate () {
    console.log('invalidate pool')
    this._invalid = true
    return this
  }

  /**
   * max number of threads
   * @returns {number}
   */
  maxPoolSize () {
    return this.numThreads
  }

  /**
   * number of jobs waiting for threads
   * @returns {number}
   */
  jobQueueDepth () {
    return this.waitingJobs.length
  }

  /**
   * Array of threads available to run
   * @returns {Thread[]}
   */
  getFreeThreads () {
    return this.freeThreads
  }

  /**@returns {boolean} */
  noJobsRunning () {
    return this.numThreads - this.freeThreads.length === 0
  }

  numAvailableThreads () {
    return this.maxPoolSize() < this.jobQueueDepth()
      ? 0
      : this.maxPoolSize() - this.jobQueueDepth()
  }

  status () {
    return {
      total: this.maxPoolSize(),
      waiting: this.jobQueueDepth(),
      available: this.numAvailableThreads(),
      performance: this.freeThreads.map(t => t.worker.performance)
    }
  }

  refresh () {
    if (this.invalid() || this.afterboot())
      this.factory.getThreadPool(this.name)
  }

  async drain () {
    return new Promise((resolve, reject) => {
      if (this.noJobsRunning()) {
        resolve(this)
      } else {
        const id = setTimeout(reject, 3000)
        this.once('noJobsRunning', () => {
          clearTimeout(id)
          resolve(this)
        })
      }
    })
  }

  runJob (jobName, jobData) {
    return new Promise(async resolve => {
      if (!this.invalid()) {
        let thread = this.freeThreads.shift()
        if (thread) {
          const result = await runInThread(this, jobName, jobData, thread)
          return resolve(result)
        }
      }
      this.waitingJobs.push(thread =>
        runInThread(this, jobName, jobData, thread, result => resolve(result))
      )
    })
  }
}

const ThreadPoolFactory = (() => {
  let threadPools = new Map()

  function createThreadPool (modelName, waitingJobs, options) {
    console.debug(createThreadPool.name)
    if (!options) options = { preload: false }
    const pool = new ThreadPool({
      file: './dist/worker.js',
      preload: options.preload,
      name: modelName,
      workerData: { modelName },
      numThreads: DEFAULT_THREADPOOL_SIZE,
      waitingJobs,
      factory: this,
      options
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
  function getThreadPool (modelName, options) {
    if (threadPools.has(modelName)) {
      const pool = threadPools.get(modelName)
      if (pool.invalid() || pool.threadPoolSize() < 1) {
        return createThreadPool(modelName, [...pool.waitingJobs])
      }
      return pool
    }
    return createThreadPool(modelName, options)
  }

  function invalidatePool (poolName) {
    const pool = threadPools.get(poolName)
    if (!pool) return false
    return pool
      .invalidate()
      .drain()
      .then(stopWorkers)
      .then(() => true)
      .catch(e => console.error(e))
  }

  async function invalidateAll () {
    return threadPools.forEach(async pool => invalidatePool(pool.name))
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  return Object.freeze({
    getThreadPool,
    listPools,
    status,
    invalidatePool,
    invalidateAll
  })
})()

export default ThreadPoolFactory

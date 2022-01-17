'use strict'

import { EventEmitter } from 'stream'
import { Worker } from 'worker_threads'

const DEFAULT_THREADPOOL_SIZE = 1

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
    console.info('terminated thread', thread.threadId)
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
function newThread (pool, file, workerData, cb = x => x) {
  const worker = new Worker(file, { workerData })
  const thread = {
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
  worker.on('online', () => cb(thread))
  return thread
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
        pool.waitingJobs.shift()(thread)
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
    options = { preload: false }
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
    this.options = options
    this.booted = false

    if (options.preload) {
      console.info('preload enabled for', this.name)
      this.addThreads()
    }
    console.debug('threads in pool', this.freeThreads.length)
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Thread}
   */
  addThread (file = this.file, workerData = this.workerData, cb) {
    console.debug('add thread')
    if (this.freeThreads.length < this.maxPoolSize())
      this.freeThreads.push(newThread(this, file, workerData, cb))
    else if (cb) this.waitingJobs.push(cb)
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Thread}
   */
  addThreads (
    total = this.numThreads,
    file = this.file,
    workerData = this.workerData,
    cb
  ) {
    for (let i = 0; i < total; i++) {
      this.addThread(file, workerData, cb)
    }
  }

  /**@returns {boolean} */
  invalid () {
    console.log('pool', this.name, 'invalid =', this._invalid)
    return this._invalid
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
    return this.numThreads.length
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
    return this.numThreads === this.freeThreads.length
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

  /**
   * Prevent new jobs from running by invalidating
   * the pool, then if any jobs are running, wait
   * for them to complete by listening for the
   * 'noJobsRunning' event
   */
  async drain () {
    this.invalidate()
    return new Promise((resolve, reject) => {
      if (this.noJobsRunning()) {
        resolve(this)
      } else {
        const id = setTimeout(reject, 10000)
        this.once('noJobsRunning', () => {
          clearTimeout(id)
          resolve(this)
        })
      }
    })
  }

  notPreloaded () {
    const pre = (this.freeThreads.length === this.waitingJobs.length) === 0
    console.debug(
      'not preloaded =',
      pre,
      this.freeThreads.length,
      this.waitingJobs.length,
      this.numThreads
    )
    return !pre
  }

  runJob (jobName, jobData) {
    return new Promise(async resolve => {
      if (!this.invalid()) {
        console.debug('not invalid')

        if (this.notPreloaded()) {
          console.debug('not preloaded')

          this.addThread(thread =>
            runInThread(this, jobName, jobData, thread, result =>
              resolve(result)
            )
          )
        } else {
          console.debug('loaded')

          let thread = this.freeThreads.shift()
          if (thread) {
            const result = await runInThread(this, jobName, jobData, thread)
            return resolve(result)
          }
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

  function createThreadPool (modelName, options, waitingJobs = []) {
    console.debug(createThreadPool.name, modelName, waitingJobs, options)

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

      if (pool.invalid()) {
        return createThreadPool(modelName, options, [...pool.waitingJobs])
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

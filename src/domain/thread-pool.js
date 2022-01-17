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
    delete thread.worker
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
function newThread ({ pool, file, workerData, cb } = {}) {
  console.debug('new thread')
  const worker = new Worker(file, { workerData })
  const thread = {
    pool,
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
  if (cb) worker.once('online', () => cb(thread))
  return thread
}

async function stopWorkers (pool) {
  await Promise.all(pool.freeThreads.map(async thread => thread.stop()))
}

/**
 *
 * @param {{
 *  pool:ThreadPool,
 *  jobName:string,
 *  jobData:any,
 *  thread:Thread,
 *  cb:function()
 * }}
 * @returns {Promise<Thread>}
 */
function postJob ({ pool, jobName, jobData, thread, cb } = {}) {
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
    thread.worker.postMessage({ name: jobName, data: jobData })
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
  addThread () {
    return newThread({
      pool: this,
      file: this.file,
      workerData: this.workerData,
      cb
    })
  }

  /**
   *
   * @param {{
   *  total:number
   *  file:string
   *  workerData
   *  cb:function(Thread)
   * }}
   */
  addThreads () {
    for (let i = 0; i < this.numThreads; i++) {
      this.freeThreads.push(this.addThread())
    }
  }

  /** @returns {boolean} */
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
  q
  /**
   * Array of threads available to run
   * @returns {Thread[]}
   */
  getFreeThreads () {
    return this.freeThreads
  }

  /** @returns {boolean} */
  noJobsRunning () {
    return this.numThreads === this.freeThreads.length
  }

  numAvailableThreads () {
    return this.numThreads < this.waitingJobs.length
      ? 0
      : this.numThreads - this.waitingJobs.length
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

  noThreads () {
    const doit = !this.booted && !this.preload
    this.booted = true
    return doit
  }

  waitOnThread () {
    return new Promise(resolve =>
      newThread({
        file: this.file,
        pool: this,
        workerData: this.workerData,
        cb: thread => resolve(thread)
      })
    )
  }

  run (jobName, jobData) {
    return new Promise(async resolve => {
      if (!this.invalid()) {
        console.debug('valid')

        let thread = this.noThreads()
          ? await this.waitOnThread()
          : this.freeThreads.shift()

        if (thread) {
          const result = await postJob({
            pool: this,
            jobName,
            jobData,
            thread
          })
          return resolve(result)
        }
      }
      this.waitingJobs.push(thread =>
        postJob({
          pool: this,
          jobName,
          jobData,
          thread,
          cb: result => resolve(result)
        })
      )
    })
  }
}

const ThreadPoolFactory = (() => {
  let threadPools = new Map()

  function createThreadPool (modelName, options, waitingJobs = []) {
    console.debug({
      func: createThreadPool.name,
      modelName,
      waitingJobs,
      options
    })

    const pool = new ThreadPool({
      file: './dist/worker.js',
      name: modelName,
      preload: options.preload,
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
    console.debug('invalidate pool')
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

'use strict'

import { EventEmitter } from 'stream'
import { Worker } from 'worker_threads'
import domainEvents from './domain-events'

const { poolOpen, poolClose } = domainEvents
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2

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

  return new Promise(resolve => {
    const timerId = setTimeout(async () => {
      const threadId = await thread.worker.terminate()
      console.warn('terminated thread', threadId)
      resolve()
    }, 5000)

    thread.worker.once('exit', () => {
      console.info('exiting', thread.threadId)
      clearTimeout(timerId)
      resolve()
    })

    thread.worker.postMessage({ name: 'shutdown' })
  })
}

/**
 * creates a new thread
 * @param {{
 *  pool:ThreadPool
 *  file:string
 *  workerData:*
 *  cb:function(Thread)
 * }} options the callback function is called once
 * the new thread comes online, i.e. we create a
 * subscription to the event 'online' and return
 * the new thread in the callback's argument
 * @returns {Thread}
 */
function newThread ({ pool, file, workerData, cb }) {
  if (pool.poolSize() === pool.maxPoolSize()) {
    console.warn('pool is maxed out')
    return
  }
  const worker = new Worker(file, { workerData })
  pool.totalThreads++
  const thread = {
    file,
    pool,
    worker,
    threadId: worker.threadId,
    createdAt: Date.now(),
    workerData,
    async stop () {
      await kill(this)
      pool.totalThreads--
    },
    toJSON () {
      return {
        ...this,
        createdAt: new Date(this.createdAt).toUTCString(),
        poolStatus: pool.status()
      }
    }
  }

  if (cb) worker.once('online', () => cb(thread))
  return thread
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
function postJob ({ pool, jobName, jobData, thread, cb }) {
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
    workerData = {},
    waitingJobs = [],
    options = { preload: false }
  } = {}) {
    super(options)
    this.freeThreads = []
    this.waitingJobs = waitingJobs
    this.file = file
    this.name = name
    this.workerData = workerData
    this.maxThreads = options.maxThreads || DEFAULT_THREADPOOL_MAX
    this.minThreads = options.minThreads || DEFAULT_THREADPOOL_MIN
    this.closed = false
    this.options = options
    this.reloads = 0
    this.transactions = 0
    this.transxQueued = 0
    this.totalThreads = 0

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
      workerData: this.workerData
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
    for (let i = 0; i < this.minPoolSize(); i++) {
      this.freeThreads.push(this.addThread())
    }
    return this
  }

  /**
   * max number of threads
   * @returns {number}
   */
  poolSize () {
    return this.totalThreads
  }

  maxPoolSize () {
    return this.maxThreads
  }

  minPoolSize () {
    return this.minThreads
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
  threadPool () {
    return this.freeThreads
  }

  /** @returns {boolean} */
  noJobsRunning () {
    return this.totalThreads === this.freeThreads.length
  }

  availableThreads () {
    return this.freeThreads.length
  }

  status () {
    return {
      name: this.name,
      open: !this.closed,
      max: this.maxPoolSize(),
      min: this.minPoolSize(),
      total: this.poolSize(),
      waiting: this.jobQueueDepth(),
      available: this.availableThreads(),
      performance: this.freeThreads.map(t => t.worker.performance),
      transactions: this.tx(),
      queueRate: this.tx() < 1 ? 0 : (this.txQ() / this.tx()) * 100,
      reloads: this.reloads
    }
  }

  /**
   * Prevent new jobs from running by closing
   * the pool, then for any jobs already running,
   * wait for them to complete by listening for the
   * 'noJobsRunning' event
   */
  async drain () {
    console.debug('drain pool')

    if (!this.closed) {
      throw new Error('close pool first')
    }

    return new Promise((resolve, reject) => {
      if (this.noJobsRunning()) {
        resolve(this)
      } else {
        const timerId = setTimeout(reject, 5000)

        this.once('noJobsRunning', () => {
          clearTimeout(timerId)
          resolve(this)
        })
      }
    })
  }

  open () {
    this.closed = false
    return this
  }

  close () {
    this.closed = true
    // failsafe: don't stay closed
    setTimeout(this.open, 2000)
    return this
  }

  noThreads () {
    return this.totalThreads === 0
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

  tx () {
    return this.transactions
  }

  txQ () {
    return this.transxQueued
  }

  run (jobName, jobData) {
    return new Promise(async resolve => {
      this.transactions++

      if (this.closed) {
        console.info('pool is closed')
      } else {
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
      console.debug('no threads; queuing job', jobName)
      this.transxQueued++

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
  /**@type {Map<string, ThreadPool>} */
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
      workerData: { modelName },
      waitingJobs,
      options
    })

    threadPools.set(modelName, pool)
    return pool
  }

  function listPools () {
    return [...threadPools].map(([k]) => k)
  }

  /**
   * returns existing or creates new threadpool for `moduleName`
   * @param {string} modelName
   * @param {{preload:boolean}} options preload means we return the actual
   * threadpool instead of the facade, which will load the remotes at startup
   * instead of loading them on the first request for `modelName`. The default
   * is false, so that startup is faster and only the minimum number of threads
   * and remote imports occur to the actual requests for this instance.
   * @returns
   */
  function getThreadPool (modelName, options = { preload: false }) {
    function getPool (modelName, options) {
      if (threadPools.has(modelName)) {
        return threadPools.get(modelName)
      }
      return createThreadPool(modelName, options)
    }

    const facade = {
      async run (jobName, jobData) {
        return getPool(modelName, options).run(jobName, jobData)
      },
      status () {
        return getPool(modelName, options).status()
      }
    }
    return options.preload ? getPool(modelName, options) : facade
  }

  /**
   * This is a hot reload. Drain the pool,
   * add new workers, stop the old ones
   * @param {string} poolName i.e. modelName
   * @returns {Promise<ThreadPool>}
   */
  async function reload (poolName) {
    console.debug('reload pool', poolName)
    const pool = threadPools.get(poolName)

    if (!pool) return

    pool.emit(poolClose(poolName), pool.status())

    return pool
      .close()
      .drain()
      .then(() => {
        const kill = pool.freeThreads.splice(0, pool.freeThreads.length)

        pool.addThreads().open()

        setTimeout(
          async () =>
            await Promise.all(kill.map(async thread => thread.stop())),
          1000
        )

        pool.emit(poolOpen(poolName), pool.status())
        pool.reloads++
        return pool
      })
      .catch(console.error)
  }

  async function reloadAll () {
    await Promise.all(threadPools.map(async pool => reload(pool.name)))
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  function listen (cb, pools = [], events = []) {
    threadPools
      .filter(pool => (pools.length > 0 ? pools.includes(pool) : true))
      .map(pool => ({ pool, events: pool.eventNames }))
      .forEach(poolEvents => {
        poolEvents.eventNames
          .filter(event => (events.length > 0 ? events.includes(event) : true))
          .forEach(poolEvent => {
            poolEvents.pool.on(poolEvent, cb)
          })
      })
  }

  return Object.freeze({
    getThreadPool,
    listPools,
    reloadAll,
    reload,
    status,
    listen
  })
})()

export default ThreadPoolFactory

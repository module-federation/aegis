'use strict'

import { EventEmitter } from 'stream'
import { Worker } from 'worker_threads'
import domainEvents from './domain-events'

const { poolOpen, poolClose, poolDrain } = domainEvents
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2
const DEFAULT_JOBQUEUE_TOLERANCE = 25

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

  return new Promise((resolve, reject) => {
    const timerId = setTimeout(async () => {
      try {
        const threadId = await thread.worker.terminate()
        console.warn('terminated thread', threadId)
        resolve()
      } catch (error) {
        console.error(kill.name, error)
        reject(error)
      }
    }, 5000)

    thread.worker.once('exit', () => {
      console.info('exiting', thread.threadId)
      clearTimeout(timerId)
      resolve()
    })

    thread.worker.postMessage({ name: 'shutdown' })
  }).catch(console.error)
}

/**
 * creates a new thread
 * @param {{
 *  pool:ThreadPool
 *  file:string
 *  workerData:WorkerOptions.workerData
 * }} params
 * @returns {Promise<Thread>}
 */
function newThread ({ pool, file, workerData }) {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(file, { workerData })
      pool.totalThreads++

      const thread = {
        file,
        pool,
        worker,
        threadId: worker.threadId,
        createdAt: Date.now(),
        async stop () {
          await kill(this)
        }
      }
      setTimeout(reject, 10000)

      worker.once('message', msg => {
        pool.emit('aegis-up')
        resolve(thread)
      })
    } catch (error) {
      console.error(newThread.name, error)
      reject(error)
    }
  }).catch(console.error)
}

/**
 * Post a job to a worker thread if available, otherwise
 * wait until one is. An optional callback can be used by
 * the caller to pass an upstream promise and return.
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
  }).catch(console.error)
}

/**
 * Contains threads, queued jobs and stats for a given `model`.
 * Start, stop, observe threads and expose pool stats. Increase
 * capacity on demand as needed up to max threads. when requested,
 * prevent pool from accepting new work and allow existing work to
 * complete. Preserve pool stats across thread restarts.
 */
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
    this.queueTolerance = options.queueTolerance || DEFAULT_JOBQUEUE_TOLERANCE
    this.closed = false
    this.options = options
    this.reloads = 0
    this.jobsRequested = 0
    this.jobsQueued = 0
    this.totalThreads = 0

    function dequeue () {
      if (this.freeThreads.length > 0 && this.waitingJobs.length > 0) {
        this.waitingJobs.shift()(this.freeThreads.shift())
      }
    }
    setInterval(dequeue.bind(this), 1500)

    if (options.preload) {
      console.info('preload enabled for', this.name)
      this.startThreads().then(
        () => (this.totalThreads = this.freeThreads.length)
      )
    }
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Promise<Thread>}
   */
  async startThread () {
    try {
      return await newThread({
        pool: this,
        file: this.file,
        workerData: this.workerData
      })
    } catch (error) {
      console.error(this.startThread.name, error)
    }
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
  async startThreads () {
    for (let i = 0; i < this.minPoolSize(); i++) {
      this.freeThreads.push(await this.startThread())
    }
    return this
  }

  /**
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

  /** @returns {boolean} */
  noJobsRunning () {
    return this.totalThreads === this.freeThreads.length
  }

  availThreadCount () {
    return this.freeThreads.length
  }

  deploymentCount () {
    return this.reloads
  }

  bumpDeployCount () {
    this.reloads++
    return this
  }

  open () {
    this.closed = false
    return this
  }

  close () {
    this.closed = true
    return this
  }

  totalTransactions () {
    return this.jobsRequested
  }

  jobQueueRate () {
    return Math.round((this.jobsQueued / this.jobsRequested) * 100)
  }

  maxJobQueueRate () {
    return this.queueTolerance
  }

  status () {
    return {
      name: this.name,
      open: !this.closed,
      max: this.maxPoolSize(),
      min: this.minPoolSize(),
      total: this.poolSize(),
      waiting: this.jobQueueDepth(),
      available: this.availThreadCount(),
      transactions: this.totalTransactions(),
      queueRate: this.jobQueueRate(),
      tolerance: this.maxJobQueueRate(),
      reloads: this.deploymentCount()
    }
  }

  async threadAlloc () {
    if (
      this.totalThreads === 0 ||
      (this.poolSize() < this.maxPoolSize() &&
        this.jobQueueRate() > this.maxJobQueueRate())
    )
      return this.startThread()
  }

  /**@typedef {import('./use-cases').UseCaseService UseCaseService*/

  /**
   * Run a job (use case function) on an available thread or queue the job
   * until one becomes available. Return the result asynchronously.
   *
   * @param {string} jobName name of a use case function in {@link UseCaseService}
   * @param {*} jobData anything that can be cloned
   * @returns {Promise<*>} anything that can be cloned
   */
  run (jobName, jobData) {
    return new Promise(async resolve => {
      this.jobsRequested++

      try {
        if (this.closed) {
          console.warn('pool is closed')
        } else {
          let thread = this.freeThreads.shift()

          if (!thread) {
            try {
              thread = await this.threadAlloc()
            } catch (error) {
              console.error(run.name, error)
            }
          }

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
        console.debug('no threads: queue job', jobName)

        this.waitingJobs.push(thread =>
          postJob({
            pool: this,
            jobName,
            jobData,
            thread,
            cb: result => resolve(result)
          })
        )

        this.jobsQueued++
      } catch (error) {
        console.error(this.run.name, error)
      }
    })
  }

  notify (fn) {
    this.emit(`${fn(this.name)}`, `pool: ${this.name}: ${fn.name}`)
    return this
  }

  /**
   * Prevent new jobs from running by closing
   * the pool, then for any jobs already running,
   * wait for them to complete by listening for the
   * 'noJobsRunning' event
   */
  async drain () {
    this.emit(poolDrain(this.name))

    if (!this.closed) {
      throw new Error('close pool first', this.name)
    }

    return new Promise((resolve, reject) => {
      if (this.noJobsRunning()) {
        resolve(this)
      } else {
        const timerId = setTimeout(reject, 4000)

        this.once('noJobsRunning', () => {
          clearTimeout(timerId)
          resolve(this)
        })
      }
    }).catch(console.error)
  }

  /**
   * Stop all threads. If existing threads are stopped immediately
   * before new threads are started, it can result in a segmentation
   * fault or bus abort, at least on Apple silicon. It seems there
   * is shared memory between threads (or v8 isolates) that is being
   * incorrectly freed.
   *
   * @returns {ThreadPool}
   */
  async stopThreads () {
    try {
      const kill = this.freeThreads.splice(0, this.freeThreads.length)
      this.totalThreads = 0

      setTimeout(
        async () => await Promise.all(kill.map(thread => thread.stop())),
        1000
      )

      return this
    } catch (e) {
      console.error(this.stopThreads.name, e)
    }
  }
}

/**
 * Create, reload, observe, destroy thread pools.
 */
const ThreadPoolFactory = (() => {
  /**@type {Map<string, ThreadPool>} */
  let threadPools = new Map()

  function createThreadPool (modelName, options) {
    console.debug({ fn: createThreadPool.name, modelName, options })

    try {
      const pool = new ThreadPool({
        file: './dist/worker.js',
        name: modelName,
        workerData: { modelName },
        waitingJobs,
        options
      })

      threadPools.set(modelName, pool)
      return pool
    } catch (e) {
      console.error(createThreadPool.name, e)
    }
  }

  function listPools () {
    return [...threadPools].map(([k]) => k)
  }

  /**
   * Returns existing or creates new threadpool for `moduleName`
   * @param {string} modelName
   * @param {{preload:boolean}} options preload means we return the actual
   * threadpool instead of a facade, which will load the remotes at startup
   * instead of loading them on the first request for `modelName`. The default
   * is false, so that startup is faster and only the minimum number of threads
   * and remote imporklklkkl
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

    try {
      return options.preload ? getPool(modelName, options) : facade
    } catch (e) {
      console.error(getThreadPool.name, e)
    }
  }

  /**
   * This is the hot reload. Drain the pool,
   * stop the existing threads & start new
   * ones, which will have the latest code
   * @param {string} poolName i.e. modelName
   * @returns {Promise<ThreadPool>}
   */
  function reload (poolName) {
    return new Promise((resolve, reject) => {
      const pool = threadPools.get(poolName)

      if (!pool) reject('no such pool')

      return pool
        .close()
        .notify(poolClose)
        .drain()
        .then(pool => pool.stopThreads())
        .then(pool => pool.startThreads())
        .then(pool => {
          pool
            .open()
            .bumpDeployCount()
            .notify(poolOpen)
          resolve(pool)
        })
        .catch(e => reject(reload.name, e))
    }).catch(console.error)
  }

  async function reloadAll () {
    try {
      await Promise.all([...threadPools].map(async ([pool]) => reload(pool)))

      const pools = ThreadPoolFactory.listPools().map(pool =>
        pool.toUpperCase()
      )
      const allModels = models
        .getModelSpecs()
        .map(spec => spec.modelName.toUpperCase())

      pools
        .filter(poolName => !allModels.includes(poolName))
        .forEach(async poolName => await ThreadPoolFactory.destroy(poolName))
    } catch (e) {
      console.error(reloadAll.name, e)
    }
  }

  function destroy (poolName) {
    return new Promise((resolve, reject) => {
      console.debug('dispose pool', poolName)

      const pool = threadPools.get(poolName)
      if (!pool) reject('no such pool', poolName)

      return pool
        .close()
        .notify(poolClose)
        .drain()
        .then(pool => pool.stopThreads())
        .then(pool => resolve(threadPools.delete(pool)))
        .catch(reject)
    }).catch(console.error)
  }

  function status (poolName = null) {
    if (poolName) {
      threadPools.get(poolName).status()
      return
    }

    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  function listen (cb, poolName, eventName) {
    if (poolName === '*') threadPools.forEach(pool => pool.on(eventName, cb))
    else threadPools.find(pool => pool.name === poolName).on(eventName, cb)
  }

  return Object.freeze({
    getThreadPool,
    listPools,
    reloadAll,
    reload,
    status,
    listen,
    destroy
  })
})()

export default ThreadPoolFactory

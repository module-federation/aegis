'use strict'

import { resolve } from 'path/posix'
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

  return new Promise(resolve => {
    thread.worker.once('exit', () => {
      console.info(
        `exiting - threadId ${thread.threadId} pool ${thread.pool.name}`
      )
      clearTimeout(timerId)
      resolve()
    })

    const timerId = setTimeout(() => {
      thread.worker.terminate()
      console.info('terminated thread', thread.threadId)
      resolve()
    }, 5000)

    thread.worker.postMessage({ name: 'shutdown' })
  })
}

/**
 * @param {ThreadPool} pool
 * @returns {Thread}
 */
function newThread ({ pool, file, workerData, cb }) {
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
    closed () {
      return pool.closed
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
      } else if (pool.open()) {
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
    this.closed = false
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
    for (let i = 0; i < this.numThreads; i++) {
      this.freeThreads.push(this.addThread())
    }
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
  threadPool () {
    return this.freeThreads
  }

  /** @returns {boolean} */
  noJobsRunning () {
    return this.numThreads === this.freeThreads.length
  }

  availableThreads () {
    return this.freeThreads.length
  }

  status () {
    return {
      total: this.maxPoolSize(),
      waiting: this.jobQueueDepth(),
      available: this.availableThreads(),
      performance: this.freeThreads.map(t => t.worker.performance)
    }
  }

  /**
   * Prevent new jobs from running by closing
   * the pool, then for any jobs already running,
   * wait for them to complete by listening for the
   * 'noJobsRunning' event
   */
  async drain () {
    console.debug('drain')

    if (!this.closed) {
      throw new Error('close pool first')
    }

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

  open () {
    this.closed = false
    return this
  }

  close () {
    this.closed = true
    return this
  }

  noThreads () {
    return this.availableThreads() < 1 && this.jobQueueDepth() < 1
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

  let counter = 0
  function getThreadPool (modelName, options) {
    function getPool (modelName, options) {
      if (threadPools.has(modelName)) {
        const pool = threadPools.get(modelName)

        if (pool.disposed) {
          return createThreadPool(modelName, options, [...pool.waitingJobs])
        }
        return pool
      }
      return createThreadPool(modelName, options)
    }

    const facade = {
      async run (jobName, jobData) {
        counter++
        return getPool(modelName, options).run(jobName, jobData)
      },
      status () {
        return {
          model: modelName,
          pool: getPool(modelName).name,
          calls: counter,
          threadIds: getPool(modelName).freeThreads.map(
            thread => thread.threadId
          ),
          ...getPool(modelName).status()
        }
      }
    }
    return options.preload ? getPool(modelName, options) : facade
  }

  /**
   *
   * @param {*} modelName
   * @returns {ThreadPool}
   */

  async function reload (poolName) {
    console.debug('drain pool', poolName)
    const pool = threadPools.get(poolName)
    if (!pool) return
    return pool
      .close()
      .drain()
      .then(() => {
        const killList = pool.freeThreads.splice(0, pool.freeThreads.length)
        pool.addThreads()
        pool.open()
        killList.forEach(thread => thread.stop())
        return pool
      })
      .catch(console.error)
  }

  async function reloadAll () {
    await Promise.all(threadPools.map(async pool => reload(pool.name)))
    return this
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  return Object.freeze({
    getThreadPool,
    listPools,
    reloadAll,
    reload,
    status
  })
})()

export default ThreadPoolFactory

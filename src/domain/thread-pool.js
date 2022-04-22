'use strict'

import EventBrokerFactory from './event-broker'
import { EventEmitter } from 'stream'
import { Worker, BroadcastChannel } from 'worker_threads'
import domainEvents from './domain-events'
import ModelFactory, { DataSourceFactory } from '.'
import os from 'os'

const { poolOpen, poolClose, poolDrain } = domainEvents
const broker = EventBrokerFactory.getInstance()
const MAINCHANNEL = 'mainChannel'
const EVENTCHANNEL = 'eventChannel'
const NOJOBSRUNNING = 'noJobsRunning'
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2
const DEFAULT_JOBQUEUE_TOLERANCE = 25
const DEFAULT_DURATION_TOLERANCE = 1000

/**
 * @typedef {object} Thread
 * @property {Worker.threadId} id
 * @property {function():Promise<void>} stop
 * @property {MessagePort} eventChannel
 * @property {Worker} mainChannel
 */

/**
 * @typedef {object} ThreadPoolFactory
 * @property {function():ThreadPool} getThreadPool
 * @property {function()} run
 * @property {function()} fireEvent
 * @property {function()} reload
 *
 */

/** @typedef {import('./model').Model} Model} */
/** @typedef {import('./event-broker').EventBroker} EventBroker */

/**
 *
 * @param {Thread} thread
 * @returns {Promise<number>}
 */
async function kill (thread) {
  try {
    return await new Promise(resolve => {
      console.info('killing thread', thread.id)

      const timerId = setTimeout(async () => {
        const threadId = await thread.mainChannel.terminate()
        console.warn('forcefully terminated thread', threadId)
        resolve(threadId)
      }, 5000)

      thread.mainChannel.once('exit', () => {
        clearTimeout(timerId)
        thread.eventChannel?.close()
        console.info('clean exit of thread', thread.id)
        resolve(thread.id)
      })

      thread.eventChannel.postMessage({ name: 'shutdown', data: 0 })
    })
  } catch (error) {
    return console.error({ fn: kill.name, error })
  }
}

/**
 * Connect event subchannel to {@link EventBroker}
 * @param {Worker} worker worker thread
 * @param {MessageChannel} channel event channel
 * {@link MessagePort} port1 main uses to send to and recv from worker
 * {@link MessagePort} port2 worker uses to send to and recv from main
 */
function connectEventChannel (worker, channel) {
  const { port1, port2 } = channel
  // transfer this port for the worker to use
  worker.postMessage({ eventPort: port2 }, [port2])
  // fire this event to forward to workers
  broker.on('to_worker', async event => port1.postMessage(event))
  // subscribe to get events from workers
  port1.onmessage = async event =>
    await broker.notify('from_worker', event.data)
}

/**
 * creates a new thread
 * @param {{
 *  pool:ThreadPool
 *  file:string
 *  workerData:WorkerOptions.workerData
 * }} param0
 * @returns {Promise<Thread>}
 */
function newThread ({ pool, file, workerData }) {
  return new Promise((resolve, reject) => {
    try {
      const eventChannel = new MessageChannel()
      const worker = new Worker(file, { workerData })
      pool.totalThreads++

      const thread = {
        file,
        pool,
        id: worker.threadId,
        createdAt: Date.now(),
        mainChannel: worker,
        eventChannel: eventChannel.port1,
        async stop () {
          await kill(this)
        }
      }
      pool.threadRef.push(thread)

      const timerId = setTimeout(async () => {
        await thread.stop()
        pool.threadRef.pop()
        reject('timeout')
      }, 10000)

      worker.once('message', msg => {
        clearTimeout(timerId)
        connectEventChannel(worker, eventChannel)
        pool.emit('aegis-up', msg)
        resolve(thread)
      })
    } catch (error) {
      console.error({ fn: newThread.name, error })
      reject(error)
    }
  }).catch(console.error)
}

/**
 * Post a job to a worker thread if available, otherwise
 * wait until one is. An optional callback can be used by
 * the caller to pass an upstream promise.
 *
 * @param {{
 *  pool:ThreadPool,
 *  jobName:string,
 *  jobData:any,
 *  thread:Thread,
 *  channel?:"mainChannel"|"eventChannel",
 *  cb?:(p) => p
 * }}
 * @returns {Promise<Thread>}
 */
function postJob ({
  pool,
  jobName,
  jobData,
  thread,
  channel = MAINCHANNEL,
  transfer = [],
  callback = r => r
}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    thread[channel].once('message', result => {
      pool.jobTime(Date.now() - startTime)

      if (pool.waitingJobs.length > 0) {
        pool.waitingJobs.shift()(thread)
      } else {
        pool.freeThreads.push(thread)
      }

      if (pool.noJobsRunning()) {
        pool.emit(NOJOBSRUNNING)
      }

      return resolve(callback(result))
    })
    thread[channel].once('error', reject)
    thread[channel].postMessage({ name: jobName, data: jobData }, transfer)
  }).catch(console.error)
}

/**
 * Contains threads, queued jobs, metrics and settings for a group of threads
 * that all do the same or similar kind of work, which could mean they all do
 * the same functional domain (e.g. Order model), or a non-functional
 * quality (CPU-bound) or both.
 *
 * - Start and stop threads (and vice versa)
 *   - total, max, min, free threads
 *   - requested, running, waiting jobs
 *   - lifetime stats: avg/h/l wait/run times by jobname, total jobs, avg jobs / sec
 * - Increase pool capacity automatically as needed up to max threads.
 * - Drain pool: i.e. prevent pool from accepting new work and allow existing
 * jobs to complete.
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
    this.maxThreads = options.maxThreads // set by ThreadPoolFactory
    this.minThreads = options.minThreads || DEFAULT_THREADPOOL_MIN
    this.queueTolerance = options.queueTolerance || DEFAULT_JOBQUEUE_TOLERANCE
    this.timeTolerance = options.timeTolerance || DEFAULT_DURATION_TOLERANCE
    this.closed = false
    this.options = options
    this.reloads = 0
    this.jobsRequested = 0
    this.jobsQueued = 0
    this.totJobTime = 0
    this.totalThreads = 0
    /** @type {Thread[]} */
    this.threadRef = []
    this.startTime = Date.now()
    this.broadcastChannel = options.bc

    if (options.preload) {
      console.info('preload enabled for', this.name)
      this.startThreads()
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
      console.error({ fn: this.startThread.name, error })
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

  jobQueueThreshold () {
    return this.queueTolerance
  }

  jobTime (millisec) {
    this.totJobTime += millisec
    this.avgJobTime = Math.round(this.totJobTime / this.jobsRequested)
  }

  jobDurationThreshold () {
    return this.timeTolerance
  }

  avgJobDuration () {
    return this.avgJobTime
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
      averageDuration: this.avgJobDuration(),
      durationTolerance: this.jobDurationThreshold(),
      queueRate: this.jobQueueRate(),
      queueRateTolerance: this.jobQueueThreshold(),
      deployments: this.deploymentCount(),
      since: new Date(this.startTime).toUTCString()
    }
  }

  capacityAvailable () {
    return this.poolSize() < this.maxPoolSize()
  }

  poolCanGrow (pool = this) {
    const conditions = {
      zeroThreads () {
        return pool.poolSize() === 0
      },
      highQueueRate () {
        return pool.jobQueueRate() > pool.jobQueueThreshold()
      },
      longJobDuration () {
        return pool.avgJobDuration() > pool.jobDurationThreshold()
      }
    }
    return (
      Object.values(conditions).some(satisfied => satisfied()) &&
      pool.capacityAvailable()
    )
  }

  async threadAlloc () {
    if (this.poolCanGrow()) return this.startThread()
  }

  /** @typedef {import('./use-cases').UseCaseService UseCaseService  */

  /**
   * Run a job (use case function) on an available thread; or queue the job
   * until one becomes available. Return the result asynchronously.
   *
   * @param {string} jobName name of a use case function in {@link UseCaseService}
   * @param {*} jobData anything that can be cloned
   * @returns {Promise<*>} anything that can be cloned
   */
  run (jobName, jobData, options = {}) {
    const { channel = MAINCHANNEL, transfer = [] } = options

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
              console.error({ fn: this.run.name, error })
            }
          }

          if (thread) {
            const result = await postJob({
              pool: this,
              jobName,
              jobData,
              thread,
              channel,
              transfer
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
            channel,
            transfer,
            callback: result => resolve(result)
          })
        )

        this.jobsQueued++
      } catch (error) {
        console.error(this.run.name, error)
      }
    })
  }

  async abort () {
    try {
      while (this.threadRef.length > 0) await this.threadRef.pop().stop()
    } catch (error) {
      console.error({ fn: this.abort.name, error })
    }
  }

  notify (fn) {
    this.emit(`${fn(this.name)}`, `pool: ${this.name}: ${fn.name}`)
    return this
  }

  async fireEvent (event) {
    return this.run(event.eventName, event, { channel: EVENTCHANNEL })
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
      throw new Error({
        fn: this.drain.name,
        msg: 'close pool first',
        pool: this.name
      })
    }

    return new Promise((resolve, reject) => {
      if (this.noJobsRunning()) {
        resolve(this)
      } else {
        const timerId = setTimeout(reject, 4000)

        this.once(NOJOBSRUNNING, () => {
          clearTimeout(timerId)
          resolve(this)
        })
      }
    })
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
        async function (threadRef) {
          await Promise.all(kill.map(thread => thread.stop()))
          // keep pointers until threads are stopped
          threadRef.splice(0, threadRef.length)
        },
        1000,
        this.threadRef
      )

      return this
    } catch (error) {
      console.error({ fn: this.stopThreads.name, error })
    }
  }

  broadcastEvent (event) {
    this.broadcastChannel.postMessage(event)
  }
}

/**
 * Create, reload, destroy, observe & report on thread pools.
 */
const ThreadPoolFactory = (() => {
  /** @type {Map<string, ThreadPool>} */
  const threadPools = new Map()
  /** @type {Map<string, BroadcastChannel>} */
  const broadcastChannels = new Map()

  function getBroadcastChannel (poolName) {
    if (broadcastChannels.has(poolName)) {
      return broadcastChannels.get(poolName)
    }

    const bc = new BroadcastChannel(poolName)
    broadcastChannels.set(poolName, bc)
    return bc
  }

  function broadcastEvent (event, poolName) {
    getBroadcastChannel(poolName).postMessage(event)
  }

  /**
   * By default the system-wide thread upper limit is the total # of cores.
   * The default behavior is to spread threads/cores evenly between models.
   * @param {*} options
   * @returns
   */
  function calculateMaxThreads (options) {
    if (options?.maxThreads) return options.maxThreads
    const nApps = ModelFactory.getModelSpecs().filter(s => !s.isCached).length
    return Math.floor(os.cpus().length / nApps || 1) || DEFAULT_THREADPOOL_MAX
  }

  /**
   * @typedef threadOptions
   * @property {string} file path of file containing worker code
   * @property {string} eval
   */

  /**
   * Creates a pool for use by a domain {@link Model}.
   * Provides a thread-safe {@link Map}.
   * @param {string} modelName named for the {@link Model} using it
   * @param {threadOptions} options
   * @returns
   */
  function createThreadPool (modelName, options) {
    console.debug({ fn: createThreadPool.name, modelName, options })

    // include the address of the shared array for the worker to access
    const sharedMap = DataSourceFactory.getDataSource(modelName).dsMap
    const maxThreads = calculateMaxThreads()
    const bc = getBroadcastChannel(modelName)
    const dsRelated = options.dsRelated || {}
    const initData = options.initData || {}
    const file = options.file || options.eval || './dist/worker.js'

    try {
      const pool = new ThreadPool({
        file,
        name: modelName,
        workerData: { modelName, sharedMap, dsRelated, initData },
        options: { ...options, maxThreads, bc }
      })

      threadPools.set(modelName, pool)
      return pool
    } catch (error) {
      console.error({ fn: createThreadPool.name, error })
    }
  }

  function listPools () {
    return [...threadPools].map(([k]) => k)
  }

  /**
   * Returns existing or creates new threadpool called `poolName`
   *
   * @param {string} poolName named after `modelName`
   * @param {{preload:boolean}} options preload means we return the actual
   * threadpool instead of a facade, which will load the remotes at startup
   * instead of loading them on the first request for service. The default
   * is `false`, so that startup is faster and only the minimum number of threads
   * and remote imports run. If one service relies on another, but that service
   * is dowm (not preloaded), the system will automatically spin up a thread and
   * start the service in order to handle the request. This overhead of starting
   * threads, which usually completes in under a second, occurs twice
   * in a service's lifetime: when started for the first time and when restarted
   * to handle a deployment.
   */
  function getThreadPool (poolName, options = { preload: false }) {
    function getPool (poolName, options) {
      if (threadPools.has(poolName)) {
        return threadPools.get(poolName)
      }
      return createThreadPool(poolName, options)
    }

    const facade = {
      async run (jobName, jobData) {
        return getPool(poolName, options).run(jobName, jobData)
      },
      status () {
        return getPool(poolName, options).status()
      },
      fireEvent (event) {
        return getPool(poolName, options).run(event.name, event.data, {
          channel: EVENTCHANNEL
        })
      },
      broadcastEvent (event) {
        return getBroadcastChannel(poolName).postMessage(event)
      }
    }

    return options.preload ? getPool(poolName, options) : facade
  }

  async function fireEvent (event) {
    const pool = threadPools.get(event.data)
    if (pool) return pool.fireEvent(event)
  }

  /**
   * post a message to all pools (at least one thread)
   * eee
   * @param {import('./event').Event} event
   */
  function fireAll (event) {
    threadPools.forEach(pool => pool.fireEvent(event))
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
      const pool = threadPools.get(poolName.toUpperCase())
      if (!pool) reject('no such pool', pool)
      pool
        .close()
        .notify(poolClose)
        .drain()
        .then(() => pool.stopThreads())
        .then(() => pool.startThreads())
        .then(() =>
          pool
            .open()
            .bumpDeployCount()
            .notify(poolOpen)
        )
        .then(resolve)
        .catch(error => reject({ fn: reload.name, error }))
    }).catch(console.error)
  }

  async function reloadAll () {
    try {
      await Promise.all([...threadPools].map(async ([pool]) => reload(pool)))
      removeUndeployedPools()
    } catch (error) {
      console.error({ fn: reload.name, error })
    }
  }

  async function removeUndeployedPools () {
    const pools = ThreadPoolFactory.listPools().map(pool => pool.toUpperCase())
    const allModels = ModelFactory.getModelSpecs().map(spec =>
      spec.modelName.toUpperCase()
    )

    await Promise.all(
      pools
        .filter(poolName => !allModels.includes(poolName))
        .map(async poolName => await destroy(poolName))
    )
  }

  function destroy (poolName) {
    return new Promise((resolve, reject) => {
      console.debug('dispose pool', poolName.toUpperCase())

      const pool = threadPools.get(poolName.toUpperCase())
      if (!pool) reject('no such pool', poolName.toUpperCase())

      return pool
        .close()
        .notify(poolClose)
        .drain()
        .then(() => pool.stopThreads())
        .then(() => resolve(threadPools.delete(pool)))
        .catch(reject)
    }).catch(console.error)
  }

  function status (poolName = null) {
    if (poolName) {
      return threadPools.get(poolName.toUpperCase()).status()
    }
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  function listen (cb, poolName, eventName) {
    if (poolName === '*') threadPools.forEach(pool => pool.on(eventName, cb))
    else
      [...threadPools]
        .find(pool => pool.name.toUpperCase() === poolName.toUpperCase())
        ?.on(eventName, cb)
  }

  // look for stuck threads
  setInterval(() => {
    threadPools.forEach(pool => {
      const workRequested = pool.totalTransactions()
      const workWaiting = pool.jobQueueDepth()
      const workersAvail = pool.availThreadCount()
      const workCompleted = workRequested - workWaiting

      // work is waiting but no workers available
      if (workWaiting > 0 && workersAvail < 1) {
        setTimeout(() => {
          // has any work been done in the last minute?
          if (
            pool.totalTransactions() - pool.jobQueueDepth() === workCompleted &&
            pool.availThreadCount() < 1
          ) {
            pool.abort()
          }
        }, 60000)
      }
    })
  }, 90000)

  return Object.freeze({
    getThreadPool,
    broadcastEvent,
    listPools,
    reloadAll,
    fireEvent,
    fireAll,
    reload,
    status,
    listen,
    destroy
  })
})()

export default ThreadPoolFactory

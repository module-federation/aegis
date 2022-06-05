'use strict'

import EventBrokerFactory from './event-broker'
import { EventEmitter } from 'stream'
import { Worker, BroadcastChannel } from 'worker_threads'
import domainEvents from './domain-events'
import ModelFactory from '.'
import { performance as perf } from 'perf_hooks'
import os from 'os'

const { poolOpen, poolClose, poolDrain, poolAbort } = domainEvents
const broker = EventBrokerFactory.getInstance()
const MAINCHANNEL = 'mainChannel'
const EVENTCHANNEL = 'eventChannel'
const NOJOBSRUNNING = 'noJobsRunning'
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2
const DEFAULT_JOBQUEUE_TOLERANCE = 25
const DEFAULT_DURATION_TOLERANCE = 1000
const DEFAULT_JOB_ABORT_DURATION = 180000

/**
 * @typedef {object} Thread
 * @property {Worker.threadId} id
 * @property {function():Promise<void>} stop
 * @property {MessagePort} eventChannel
 * @property {Worker} mainChannel
 */
/**@typedef {string} poolName*/
/**@typedef {string} jobName*/
/**@typedef {string} jobData*/
/**@typedef {{channel:'mainChannel'|'eventChannel'}} options*/
/**
 * @typedef {object} ThreadPoolFactory
 * @property {function():ThreadPool} getThreadPool
 * @property {function(jobName, jobData, ?options)} run - run job over main channel
 * @property {function(poolName,import('.').Event)} fireEvent -
 * send `event` to `poolName` over event channel
 * @property {function(import('.').Event)} fireAll -
 * send `event` to all pools
 * @property {function()} reload
 */

/** @typedef {import('./model').Model} Model} */
/** @typedef {import('./event-broker').EventBroker} EventBroker */

/**
 *
 * @param {Thread} thread
 * @returns {Promise<number>}
 */
async function kill (thread, reason) {
  try {
    return await new Promise(resolve => {
      console.info({ msg: 'killing thread', id: thread.id, reason })
      const TIMEOUT = 8000
      const start = perf.now()

      const timerId = setTimeout(async () => {
        await thread.mainChannel.terminate()
        console.warn({
          msg: 'forcefully terminated thread',
          id: thread.id,
          reason
        })
        resolve(thread.id)
      }, TIMEOUT)

      thread.mainChannel.once('exit', () => {
        clearTimeout(timerId)
        thread.eventChannel.close()
        // the timeout will cause this to run if executed first
        if (perf.now() - start < TIMEOUT)
          console.info('clean exit of thread', thread.id, reason)
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
  port1.onmessage = async event => {
    console.log({ fn: 'main: port1.onmessage', data: event.data })
    if (event.data.eventName) await broker.notify('from_worker', event.data)
  }
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
    const eventChannel = new MessageChannel()
    const worker = new Worker(file, { workerData })

    try {
      const thread = {
        file,
        pool,
        id: worker.threadId,
        createdAt: perf.now(),
        mainChannel: worker,
        eventChannel: eventChannel.port1,
        async stop (reason) {
          await kill(this, reason)
        }
      }
      pool.threads.push(thread)

      const timerId = setTimeout(async () => {
        const message = 'timedout creating thread'
        console.error({ fn: newThread.name, message })
        reject(message)
      }, 50000)

      worker.once('message', async msg => {
        clearTimeout(timerId)
        connectEventChannel(worker, eventChannel)
        pool.emit('aegis-up', msg)
        resolve(thread)
      })
    } catch (error) {
      console.error({ fn: newThread.name, error })
      reject(error)
    }
  })
}

/**
 * Reallocate a newly freed thread. If a job
 * is waiting, run it. Otherwise, return the
 * thread to {@link ThreadPool.freeThreads}.
 *
 * @param {ThreadPool} pool
 * @param {Thread} freeThread
 */
function reallocate (pool, freeThread) {
  if (pool.waitingJobs.length > 0) {
    // call `postJob`: the caller has provided a callback to run
    // when the job is done so just catch any errors and move on
    pool.waitingJobs
      .shift()(freeThread)
      .catch(error => console.error({ fn: reallocate.name, error }))
  } else {
    pool.freeThreads.push(freeThread)
  }
}

/**
 * Post a job to a worker thread if one is available, otherwise
 * queue the job until one is. Then run the callback, passing the
 * results in the first param. The caller can specify a custom
 * callback or just use the default.
 *
 * The caller passes a callback to get the results,
 * so there's no need to `await`.
 *
 * @param {{
 *  pool:ThreadPool,
 *  jobName:string,
 *  jobData:any
 *  thread:Thread,
 *  channel?:"mainChannel"|"eventChannel",
 *  cb?:(p) => p
 * }}
 * @returns {Promise<Model>}
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
    const startTime = perf.now()

    thread[channel].once('message', result => {
      pool.jobTime(perf.now() - startTime)
      // reallocate freed thread
      reallocate(pool, thread)

      if (pool.noJobsRunning()) {
        pool.emit(NOJOBSRUNNING)
      }
      resolve(callback(result))
    })

    thread[channel].once('error', async error => {
      console.error({ fn: postJob.name, error })
      pool.incrementErrorCount()

      reallocate(pool, thread)

      pool.emit({
        eventName: 'ThreadException',
        message: 'unhandled error in thread',
        pool: pool.name,
        error
      })
      reject(callback(error))
    })

    thread[channel].postMessage({ name: jobName, data: jobData }, transfer)
  })
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
    /** @type {Thread[]} */
    this.freeThreads = []
    this.waitingJobs = waitingJobs
    this.file = file
    this.name = name
    this.workerData = workerData
    this.maxThreads = options.maxThreads // set by ThreadPoolFactory
    this.minThreads = options.minThreads || DEFAULT_THREADPOOL_MIN
    this.abortTolerance = options.abortTolerance || DEFAULT_JOB_ABORT_DURATION
    this.queueTolerance = options.queueTolerance || DEFAULT_JOBQUEUE_TOLERANCE
    this.durationTolerance =
      options.durationTolerance || DEFAULT_DURATION_TOLERANCE
      this.jobTime
    this.closed = false
    this.options = options
    this.reloads = 0
    this.jobsRequested = 0
    this.jobsQueued = 0
    this.totJobTime = 0
    /** @type {Thread[]} */
    this.threads = []
    this.startTime = Date.now()
    this.broadcastChannel = options.bc
    this.aborting = false

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

  async stopThread (thread, reason) {
    await thread.stop(reason)
    this.threads.splice(
      this.threads.findIndex(t => t.id === thread.id),
      1
    )
    this.freeThreads.splice(
      this.freeThreads.findIndex(t => t.id === thread.id),
      1
    )
    return this
  }

  /**
   * @returns {number}
   */
  poolSize () {
    return this.threads.length
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

  availThreadCount () {
    return this.freeThreads.length
  }

  noJobsRunning () {
    return this.freeThreads.length === this.threads.length
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
    return this
  }

  jobDurationThreshold () {
    return this.durationTolerance
  }

  avgJobDuration () {
    return this.avgJobTime
  }

  incrementErrorCount () {
    this.errors++
    return this
  }

  errorCount () {
    return this.errors
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
      errors: this.errorCount(),
      since: new Date(this.startTime).toUTCString()
    }
  }

  errorRateThreshold () {
    return this.errorRateTolerance
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
      },
      tooManyErrors () {
        return (
          (pool.errorCount() / pool.totJobTime()) * 100 >
          pool.errorRateThreshold()
        )
      }
    }
    return (
      Object.values(conditions).some(satisfied => satisfied()) &&
      pool.capacityAvailable()
    )
  }

  /**
   * Spin up a new thread if needed and available.
   */
  async allocate () {
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
          return reject(this)
        }

        let thread = this.freeThreads.shift()

        if (!thread) {
          try {
            thread = await this.allocate()
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

  async abort (reason) {
    try {
      this.aborting = true
      this.broadcastEvent({ eventName: 'abort' })
      console.warn('pool is aborting', this.name)
      this.notify(poolAbort)
      this.freeThreads.splice(0, this.freeThreads.length)
      while (this.threads.length > 0) await this.threads.pop().stop(reason)
    } catch (error) {
      console.error({ fn: this.abort.name, error })
    } finally {
      this.aborting = false
      this.closed = false
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
  async stopThreads (reason) {
    try {
      const kill = this.freeThreads.splice(0, this.freeThreads.length)
      this.threads.splice(0, this.threads.length)

      setTimeout(
        async () => await Promise.all(kill.map(thread => thread.stop(reason))),
        1000
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

  /**
   * Send message to all threads of a pool.
   * @param {import('.').Event} event
   * @param {string} poolName same as `modelName`
   */
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
    const sharedMap = options.sharedMap
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
    return [...threadPools.keys()]
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
      async fireEvent (event) {
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

  /**
   * Unlike all other events, when the caller fires
   * an event with this function it returns a response.
   *
   * @param {import('.').Event} event
   * @returns {Promise<any>} returns a response
   */
  async function fireEvent (event) {
    const pool = threadPools.get(event.data)
    if (pool) return pool.fireEvent(event)
  }

  class ReloadError extends Error {
    constructor (error) {
      super(`fn: "reload" status: "failed" error: ${error}`)
    }
  }

  /**
   * This is the hot reload. Drain the pool,
   * stop the existing threads & start new
   * ones, which will have the latest code
   * @param {string} poolName i.e. modelName
   * @returns {Promise<ThreadPool>}
   * @throws {ReloadError}
   */
  function reload (poolName) {
    return new Promise((resolve, reject) => {
      const pool = threadPools.get(poolName.toUpperCase())
      if (!pool) reject('no such pool', pool)
      pool
        .close()
        .notify(poolClose)
        .drain()
        .then(() => pool.stopThreads(reload.name))
        .then(() => pool.startThreads())
        .then(() =>
          pool
            .open()
            .bumpDeployCount()
            .notify(poolOpen)
        )
        .then(resolve)
        .catch(error => reject(new ReloadError(error)))
    })
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
        .then(() => pool.stopThreads(destroy.name))
        .then(() => resolve(threadPools.delete(pool)))
        .catch(reject)
    })
  }

  function status (poolName = null) {
    if (poolName) {
      return threadPools.get(poolName.toUpperCase()).status()
    }
    return [...threadPools].map(([, v]) => v.status())
  }

  function listen (cb, poolName, eventName) {
    // if (poolName === '*') threadPools.forEach(pool => pool.on(eventName, cb))
    // else
    //   [...threadPools]
    //     .find(pool => pool.name.toUpperCase() === poolName.toUpperCase())
    //     .on(eventName, cb)
  }

  let monitorIntervalId

  const poolMaxAbortTime = () =>
    Math.max(...[...threadPools].map(pool => pool[1].abortTolerance))

  /**
   * Monitor pools for stuck threads and restart them
   */
  function monitorPools () {
    monitorIntervalId = setInterval(() => {
      threadPools.forEach(pool => {
        const workRequested = pool.totalTransactions()
        const workWaiting = pool.jobQueueDepth()
        const workersAvail = pool.availThreadCount()
        const workCompleted = workRequested - workWaiting

        // work is waiting but no workers available
        if (workWaiting > 0 && workersAvail < 1) {
          // give some time to correct
          if (pool.aborting) return

          setTimeout(async () => {
            // has any work been done in the last 3 minutes?
            if (
              pool.jobQueueDepth() > 0 &&
              pool.availThreadCount() < 1 &&
              pool.totalTransactions() - pool.jobQueueDepth() === workCompleted
            ) {
              // no threads are avail and no work done for 3 minutes
              console.warn('killing stuck threads', pool.status())
              await pool.abort('stuck threads')
              // get waitng jobs going
              pool.waitingJobs.shift()(await pool.allocate())
            }
          }, pool.abortTolerance)
        }
      })
    }, poolMaxAbortTime() * 1.5)
  }

  function pauseMonitoring () {
    clearInterval(monitorIntervalId)
  }

  function resumeMonitoring () {
    monitorPools()
  }

  monitorPools()

  return Object.freeze({
    getThreadPool,
    broadcastEvent,
    fireEvent,
    listPools,
    reloadAll,
    reload,
    status,
    listen,
    destroy,
    pauseMonitoring,
    resumeMonitoring
  })
})()

export default ThreadPoolFactory

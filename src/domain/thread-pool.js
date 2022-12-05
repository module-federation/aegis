'use strict'

import EventBrokerFactory from './event-broker'
import { EventEmitter } from 'stream'
import { Worker, BroadcastChannel } from 'worker_threads'
import domainEvents from './domain-events'
import ModelFactory, { totalServices } from '.'
import os from 'os'
import { AsyncResource } from 'async_hooks'
import { requestContext } from '.'
import path from 'path'

const { poolOpen, poolClose, poolDrain, poolAbort } = domainEvents
const broker = EventBrokerFactory.getInstance()
const NOJOBS = 'noJobsRunning'
const MAINCHANNEL = 'mainChannel'
const EVENTCHANNEL = 'eventChannel'
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2
const DEFAULT_JOBQUEUE_MAX = 25
const DEFAULT_JOBERROR_MAX = 10
const DEFAULT_EXECTIME_MAX = 1000
const DEFAULT_TIME_TO_LIVE = 180000

/**
 * @typedef {object}.thr Thread
 * @property {WorkereadId} id
 * @property {function():Promise<void>} stop
 * @property {MessagePort} eventChannel
 * @property {Worker} mainChannel
 */

/**@typedef {string} poolName*/
/**@typedef {string} jobName*/
/**@typedef {string} jobData*/
/**@typedef {{channel:'mainChannel'|'eventChannel'}} options*/
/**
 * @typedef {{
 *  jobName: string,
 *  jobData: string,
 *  resolve: (x)=>x,
 *  reject: (x)=>x
 *  channel: "mainChannel" | "eventChannel"
 * }} Job
 */
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
 * @typedef {object} Thread
 * @property {Worker} mainChannel
 * @property {MessagePort} eventChannel
 * @property {function(Job)} run
 * @property {function(reason)} stop
 */

/**
 *
 * Queues break async context so make this an async resource
 */
class Job extends AsyncResource {
  constructor ({ jobName, jobData, modelName, resolve, reject, options }) {
    super('Job')
    const store = new Map([...requestContext.getStore()])
    store.set('asyncId', this.asyncId())
    store.delete('res') // can't pass socket
    this.requestId = store.get('id')
    this.options = options
    this.jobName = jobName
    this.jobData = { jobData, modelName, context: store }
    this.resolve = result => this.runInAsyncScope(resolve, null, result)
    this.reject = error => this.runInAsyncScope(reject, null, error)
    console.debug('new job, requestId', this.requestId, this.jobData)
  }

  startTimer () {
    this.startTime = Date.now()
  }

  stopTimer () {
    this.duration = Date.now() - this.startTime
    requestContext.getStore().set('threadDuration', this.duration)
    return this.duration
  }

  destructure () {
    return {
      jobName: this.jobName,
      jobData: this.jobData,
      resolve: this.resolve,
      reject: this.reject,
      ...this.options
    }
  }

  dispose () {
    this.emitDestroy()
  }
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
    options = {
      preload: false,
      eventEmitterOptions: { captureRejections: true }
    }
  } = {}) {
    super(options.eventEmitterOptions)
    /** @type {Thread[]} */
    this.threads = []
    /** @type {Array<Thread>} */
    this.freeThreads = []
    /** @type {Array<Job=>Thread.run(Job)>}*/
    this.waitingJobs = waitingJobs
    this.file = file
    this.name = name
    this.workerData = workerData
    this.maxThreads = options.maxThreads || DEFAULT_THREADPOOL_MAX
    this.minThreads = options.minThreads || DEFAULT_THREADPOOL_MIN
    this.jobAbortTtl = options.jobAbortTtl || DEFAULT_TIME_TO_LIVE
    this.jobQueueMax = options.jobQueueMax || DEFAULT_JOBQUEUE_MAX
    this.execTimeMax = options.execTimeMax || DEFAULT_EXECTIME_MAX
    this.jobErrorMax = options.jobErrorMax || DEFAULT_JOBERROR_MAX
    this.errors = 0
    this.closed = false
    this.options = options
    this.reloads = 0
    this.totJobTime = 0
    this.startTime = Date.now()
    this.aborting = false
    this.jobsRequested = this.jobsQueued = 0
    this.broadcastChannel = options.broadcast

    if (options?.preload) {
      console.info('preload enabled for', this.name)
      this.startThreads()
    }
  }

  /**
   * Connect event subchannel to {@link EventBroker}
   * @param {Worker} worker worker thread
   * @param {MessageChannel} channel event channel
   * {@link MessagePort} port1 main uses to send to and recv from worker
   * {@link MessagePort} port2 worker uses to send to and recv from main
   */
  connectEventChannel (worker, channel) {
    const { port1, port2 } = channel
    // transfer this port for the worker to use
    worker.postMessage({ eventPort: port2 }, [port2])
    // fire 'to_worker' to forward event to worker threads
    broker.on('to_worker', event => port1.postMessage(event))
    // on receipt of event from worker thread fire 'from_worker'
    port1.onmessage = async event =>
      event.data.eventName && broker.notify('from_worker', event.data)
  }

  /**
   * creates a new thread
   * @param {{
   *  pool:ThreadPool
   *  file:string
   *  workerData:WorkerOptions.workerData
   * }} param0
   * @returns {Thread}
   */
  newThread ({ pool = this, file, workerData }) {
    return new Promise((resolve, reject) => {
      EventEmitter.captureRejections = true
      const eventChannel = new MessageChannel()
      const worker = new Worker(file, { workerData })

      /**
       * @type {Thread}
       */
      const thread = {
        file,
        pool,
        id: worker.threadId,
        createdAt: Date.now(),
        mainChannel: worker,
        eventChannel: eventChannel.port1,

        once (event, callback) {
          worker.on(event, callback)
        },

        async stop () {
          return worker.terminate()
        },

        /**
         * Run job on this thread.
         *
         * @param {Job} job
         */
        run (job) {
          const {
            jobName: name,
            jobData: data,
            transfer = [],
            channel = MAINCHANNEL
          } = job.destructure()

          const unsubscribe = (eventName, callback) =>
            this[channel].removeListener(eventName, callback)

          const messageFn = AsyncResource.bind(result => {
            pool.jobTime(job.stopTimer())
            unsubscribe('error', errorFn)
            unsubscribe('exit', exitFn)
            // Was this the only job running?
            if (pool.noJobsRunning()) pool.emit(NOJOBS)
            // invoke callback to return result
            if (result.hasError) job.reject(result)
            else job.resolve(result)
            // reallocate thread
            pool.reallocate(this)
            job.dispose()
          })

          const errorFn = AsyncResource.bind(error => {
            pool.jobTime(job.stopTimer())
            console.error({ fn: this.run.name, error })
            unsubscribe('exit', exitFn)
            unsubscribe('message', messageFn)
            pool.incrementErrorCount()
            pool.threads.splice(pool.threads.indexOf(this), 1)
            pool.emit('unhandledThreadError', error)
            job.reject(error)
            job.dispose()
          })

          // in case no error is emitted
          const exitFn = AsyncResource.bind(exitCode => {
            pool.jobTime(job.stopTimer())
            console.warn('thread exited', { thread: this, exitCode })
            unsubscribe('message', messageFn)
            unsubscribe('error', errorFn)
            pool.threads.splice(pool.threads.indexOf(this), 1)
            job.reject(exitCode)
            job.dispose()
          })

          console.debug('run on thread', { id: this.id, channel, name, data })

          this[channel].once('message', messageFn)
          this[channel].once('error', errorFn)
          this[channel].once('exit', exitFn)

          job.startTimer()

          this[channel].postMessage({ name, data }, transfer)
        }
      }

      worker.once('online', () => {
        pool.connectEventChannel(worker, eventChannel)
        pool.threads.push(thread)
        resolve(thread)
      })
    })
  }

  /**
   * Reallocate a newly freed thread. If a job
   * is waiting, run it. Otherwise, return the
   * thread to {@link ThreadPool.freeThreads}.
   *
   * @param {ThreadPool} pool
   * @param {Thread} thread
   */
  reallocate (thread) {
    if (this.waitingJobs.length > 0)
      // call thread.run
      this.waitingJobs.shift()(thread)
    // return to pool
    else this.freeThreads.push(thread)
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Promise<Thread>}
   */
  async startThread () {
    return this.newThread({
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
  async startThreads () {
    for (let i = 0; i < this.minPoolSize(); i++)
      this.freeThreads.push(await this.startThread())
    return this
  }

  /**
   *
   * @param {Thread} threa
   * @param {*} reason
   * @returns
   */
  async stopThread (thread, reason) {
    const exitCode = await thread.stop()
    const exitStatus = { pool: this.name, id: thread.id, exitCode, reason }
    this.emit('threadExit', exitStatus)
    return exitStatus
  }

  async stopThreads (reason) {
    for await (const thread of this.threads)
      console.warn(this.stopThread(thread, reason))
    this.freeThreads.splice(0, this.freeThreads.length)
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
  s
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
    return this.jobQueueMax
  }

  jobTime (millisec) {
    this.totJobTime += millisec
    this.avgJobTime = Math.round(this.totJobTime / this.jobsRequested)
    return this
  }

  jobDurationThreshold () {
    return this.execTimeMax
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

  errorRateThreshold () {
    return this.jobErrorMax
  }

  errorRate () {
    return (this.errors / this.totJobTime) * 100
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
      errorRate: this.errorRate(),
      errorRateTolerance: this.errorRateThreshold(),
      errors: this.errorCount(),
      deployments: this.deploymentCount(),
      since: new Date(this.startTime).toISOString()
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
      },
      tooManyErrors () {
        return pool.errorRate() > pool.errorRateThreshold()
      }
    }
    return (
      pool.capacityAvailable() &&
      Object.values(conditions).some(satisfied => satisfied())
    )
  }

  /**
   * Spin up a new thread if needed and available.
   */
  async allocate () {
    if (this.poolCanGrow()) return this.startThread()
  }

  /**
   * Run a job (use case function) on an available thread; or queue the job
   * until one becomes available.
   *
   * @param {string} jobName name of a use case function in {@link UseCaseService}
   * @param {*} jobData anything that can be cloned
   * @param {string} modelName its possible to have multiple models per domain
   * @returns {Promise<*>} anything that can be cloned
   */
  runJob (jobName, jobData, modelName, options = {}) {
    return new Promise(async (resolve, reject) => {
      this.jobsRequested++

      if (this.closed) {
        console.warn('pool is closed')
        return reject('pool is closed')
      }

      const job = new Job({
        jobName,
        jobData,
        resolve,
        reject,
        modelName,
        ...options
      })

      let thread = this.freeThreads.shift()

      if (!thread) thread = await this.allocate()

      if (thread) {
        thread.run(job)
        return
      }

      console.warn('no threads: queuing job', jobName)
      this.waitingJobs.push(thread => thread.run(job))
      this.jobsQueued++
    })
  }

  async abort (reason) {
    console.warn('pool is aborting', this.name, reason)
    this.aborting = true

    await this.close()
      .notify(poolAbort)
      .stopThreads(reason)

    this.aborting = false
    this.open()
  }

  notify (fn) {
    this.emit(`${fn(this.name)}`, `pool: ${this.name}: ${fn.name}`)
    return this
  }

  /**
   * Fire event with the given scope (host, pool, thread)
   * @param {{
   *   scope:'host'|'pool'|'thread'|'response',
   *   data:string,
   *   name:string
   * }} event
   * @returns
   */
  async fireEvent (event) {
    const eventScopes = {
      host: event =>
        broker.notify('to_worker', { ...event, eventSource: this.name }),

      pool: event => this.broadcastEvent(event),

      thread: event => {
        const thread = this.freeThreads[0] || this.threads[0]
        thread.eventChannel.postMessage(event)
      },

      response: event =>
        this.runJob(event.eventName, event, this.name, {
          channel: EVENTCHANNEL
        })
    }

    const res = eventScopes[event.scope](event)

    return event.scope === 'response' ? await res : this
  }

  reload (pool = this) {
    return new Promise((resolve, reject) => {
      pool
        .close()
        .notify(poolClose)
        .drain()
        .then(pool => pool.stopThreads('reload'))
        .then(pool => pool.startThreads())
        .then(pool =>
          pool
            .open()
            .bumpDeployCount()
            .notify(poolOpen)
        )
        .catch(reject)
        .then(resolve)
    })
  }

  destroy (pool = this) {
    return new Promise((resolve, reject) => {
      pool
        .close()
        .notify(poolClose)
        .drain()
        .then(pool => pool.stopThreads('destroy'))
        .catch(reject)
        .then(resolve)
    })
  }

  /**
   * Prevent new jobs from running by closing
   * the pool, then for any jobs already running,
   * wait for them to complete by listening for the
   * 'noJobsRunning' event
   * @returns {ThreadPool}
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
      if (this.noJobsRunning()) resolve(this)
      else {
        const timerId = setTimeout(
          () => reject(new Error('drain timeout')),
          4000
        )

        this.once(NOJOBS, () => {
          clearTimeout(timerId)
          resolve(this)
        })
      }
    })
  }

  /**
   * send event to all worker threads in this pool
   * @param {string} eventName
   */
  broadcastEvent (eventName) {
    this.broadcastChannel.postMessage(eventName)
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
    if (broadcastChannels.has(poolName)) return broadcastChannels.get(poolName)
    const channel = new BroadcastChannel(poolName)
    broadcastChannels.set(poolName, channel)
    return channel
  }

  /**
   * Send `event` to all threads of a `poolName`.
   * @param {import('.').Event} event
   * @param {string} poolName same as `modelName`
   */
  function broadcastEvent (event, poolName) {
    getBroadcastChannel(poolName).postMessage(event)
  }

  /**
   * By default the system-wide thread upper limit = the total # of cores.
   * The default behavior is to spread cores evenly between domains. In
   * the ModelSpec, this includes standalone models, e.g. models that
   * have no domain configured or whose domain name is the same as its modelName.
   *
   * @param {*} options
   * @returns
   */
  function calculateMaxThreads (options) {
    // defer to explicitly set value
    if (options?.maxThreads) return options.maxThreads
    // divide the total cpu count by the number of domains
    return Math.floor(
      os.cpus().length / totalServices() || DEFAULT_THREADPOOL_MAX
    )
  }

  /**
   * @typedef threadOptions
   * @property {string} file path of file containing worker code
   * @property {string} eval
   */

  /**
   * Creates a pool for use by one or more {@link Model}s of a domain.
   * Provides shared memory {@link Map}s accessible from other authorized pools.
   * @param {string} poolName use {@link Model.getName()}
   * @param {threadOptions} options
   * @returns
   */
  function createThreadPool (poolName, options) {
    console.debug({ fn: createThreadPool.name, modelName: poolName, options })

    // include the shared array for the worker to access
    const sharedMap = options.sharedMap
    const dsRelated = options.dsRelated || {}
    const broadcast = getBroadcastChannel(poolName)
    const maxThreads = calculateMaxThreads()
    const file =
      options.file || options.eval || path.resolve(__dirname, 'worker.js')

    try {
      const pool = new ThreadPool({
        file,
        name: poolName,
        workerData: { poolName, sharedMap, dsRelated },
        options: { ...options, maxThreads, broadcast }
      })

      threadPools.set(poolName, pool)
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
  function getThreadPool (poolName, options) {
    function getPool (poolName, options) {
      if (threadPools.has(poolName)) return threadPools.get(poolName)
      return createThreadPool(poolName, options)
    }

    const facade = {
      async runJob (jobName, jobData, modelName) {
        return getPool(poolName, options).runJob(jobName, jobData, modelName)
      },
      status () {
        return getPool(poolName, options).status()
      },
      async fireEvent (event) {
        return getPool(poolName, options).fireEvent(event)
      },
      broadcastEvent (event) {
        // dont create the pool for this
        return getBroadcastChannel(poolName).postMessage(event)
      }
    }

    return options?.preload ? getPool(poolName, options) : facade
  }

  /**
   * Unlike all other events, when the caller fires
   * an event with this function it returns a response.
   *
   * @param {import('.').Event} event
   * @returns {Promise<any>} returns a response
   */
  async function fireEvent (event) {
    const pool = threadPools.get(event.domain)
    if (pool) return pool.fireEvent(event)
  }

  /**
   * This is the hot reload. Drain the pool,
   * stop the pool and then start lsskk
   * @param {string} poolName i.e. modelName
   * @returns {Promise<ThreadPool>}
   * @throws {ReloadError}
   */
  function reload (poolName) {
    return new Promise((resolve, reject) => {
      const pool = threadPools.get(poolName.toUpperCase())
      if (!pool) reject(`no such pool ${pool}`)
      pool.reload()
    })
  }

  async function reloadPools () {
    try {
      await Promise.all([...threadPools].map(async ([pool]) => reload(pool)))
      removeUndeployedPools()
    } catch (error) {
      console.error({ fn: reload.name, error })
    }
  }

  async function removeUndeployedPools () {
    const allModels = ModelFactory.getModelSpecs().map(spec => spec.modelName)
    await Promise.all(
      listPools()
        .filter(poolName => !allModels.includes(poolName.toUpperCase()))
        .map(poolName => destroy(threadPools.get(poolName)))
    )
  }

  function destroy (pool) {
    return new Promise((resolve, reject) => {
      console.debug('dispose pool', pool.name)
      pool.destroy()
    })
  }

  async function destroyPools () {
    await Promise.all([...threadPools].map(([, pool]) => destroy(pool)))
    threadPools.clear()
  }

  function status (poolName = null) {
    if (poolName) return threadPools.get(poolName.toUpperCase()).status()
    return [...threadPools].map(([, v]) => v.status())
  }

  function listen (cb, poolName, eventName) {
    if (poolName === '*') threadPools.forEach(pool => pool.on(eventName, cb))
    else {
      const pool = [...threadPools.values()].find(
        pool => pool.name.toUpperCase() === poolName.toUpperCase()
      )
      if (pool) pool.on(eventName, cb)
    }
  }

  let monitorIntervalId

  const poolMaxAbortTime = () =>
    [...threadPools].reduce(
      (max, pool) => (max > pool[1].jobAbortTtl ? max : pool[1].jobAbortTtl),
      DEFAULT_TIME_TO_LIVE
    )

  /**
   *
   * @param {ThreadPool} pool
   * @returns
   */
  async function abort (pool, reason) {
    // no threads are avail and no work done for 3 minutes
    console.warn('aborting pool', { pool, reason })
    await pool.abort(reason)

    // get jobs going again
    if (pool.jobQueueDepth() > 1) {
      try {
        const runJob = pool.waitingJobs.shift()
        const thread = await pool.allocate()
        if (thread) runJob(thread)
        else {
          pool.waitingJobs.push(runJob)
          console.error('no threads after abort', pool)
          pool.emit('noThreadsAfterAbort', pool)
        }
      } catch (error) {
        console.error({ fn: abort.name, error })
      }
    }
  }

  /**
   * Monitor pools for stuck threads and restart them
   */
  function monitorPools () {
    monitorIntervalId = setInterval(() => {
      threadPools.forEach(pool => {
        if (pool.aborting) return

        const workRequested = pool.totalTransactions()
        const workWaiting = pool.jobQueueDepth()
        const workersAvail = pool.availThreadCount()
        const workCompleted = workRequested - workWaiting

        // work is waiting but no workers available
        if (workWaiting > 0 && workersAvail < 1) {
          // give some time to correct

          setTimeout(async () => {
            if (pool.aborting) return

            // has any work been done in the last 3 minutes?
            if (
              pool.jobQueueDepth() > 0 &&
              pool.availThreadCount() < 1 &&
              pool.totalTransactions() - pool.jobQueueDepth() === workCompleted
            ) {
              const timerId = setTimeout(() => abort(pool), 1000)

              for (const thread of pool.threads) {
                if (pool.aborting || !timerId) return

                thread.run(
                  new Job({
                    jobName: 'ping',
                    jobData: timerId,
                    options: { channel: EVENTCHANNEL },
                    reject: console.error,
                    resolve: result =>
                      result === timerId &&
                      clearTimeout(result) &&
                      (timerId = null) &&
                      pool.freeThreads.push(thread)
                  })
                )
              }
            }
          }, pool.jobAbortTtl)
        }
      })
    }, poolMaxAbortTime())
  }

  function pauseMonitoring () {
    clearInterval(monitorIntervalId)
  }

  function resumeMonitoring () {
    monitorPools()
  }

  monitorPools()

  broker.on('reload', destroyPools)

  return Object.freeze({
    getThreadPool,
    broadcastEvent,
    fireEvent,
    listPools,
    reloadPools,
    reload,
    status,
    listen,
    destroy,
    destroyPools,
    pauseMonitoring,
    resumeMonitoring
  })
})()

export default ThreadPoolFactory

'use strict'

import EventBrokerFactory from './event-broker'
import { EventEmitter } from 'stream'
import { setEnvironmentData, Worker, workerData } from 'worker_threads'
import { SharedMap } from 'sharedmap'
import domainEvents from './domain-events'
import ModelFactory, { DataSourceFactory } from '.'
import os from 'os'
const { poolOpen, poolClose, poolDrain } = domainEvents
const broker = EventBrokerFactory.getInstance()
const DEFAULT_THREADPOOL_MIN = 1
const DEFAULT_THREADPOOL_MAX = 2
const DEFAULT_JOBQUEUE_TOLERANCE = 25
const DEFAULT_DURATION_TOLERANCE = 1000
const EVENTCHANNEL_MAXRETRY = 20

export let threadId
/**
 * @typedef {object} Thread
 * @property {Worker.threadId} id
 * @property {Worker} worker
 * @property {function()} stop
 * @property {MessagePort} eventPort
 */

/**
 * @typedef {import('./model').Model} Model}
 */

/**
 *
 * @param {Thread} thread
 * @returns {Promise<number>}
 */
async function kill (thread) {
  try {
    return await new Promise((resolve, reject) => {
      console.info('killing thread', thread.id)

      const timerId = setTimeout(async () => {
        try {
          const threadId = await thread.worker.terminate()
          console.warn('forcefully terminated thread', threadId)
          resolve(threadId)
        } catch (error) {
          console.error({ fn: kill.name, error })
          reject(error)
        }
      }, 5000)

      thread.worker.once('exit', () => {
        clearTimeout(timerId)
        thread.eventPort.close()
        console.info('clean exit of thread', thread.id)
        resolve(thread.id)
      })

      thread.eventPort.postMessage({ name: 'shutdown', data: 0 })
    })
  } catch (error) {
    return console.error({ fn: kill.name, error })
  }
}

/** @typedef {import('./event-broker').EventBroker} EventBroker */

/**
 * Connect event subchannel to {@link EventBroker}
 * @param {Worker} worker worker thread
 * @param {MessageChannel} channel event channel
 * {@link MessagePort} port1 main uses to send to and recv from worker
 * {@link MessagePort} port2 worker uses to send to and recv from main
 */
function connectEventChannel (worker, channel) {
  const { port1, port2 } = channel
  worker.postMessage({ eventPort: port2 }, [port2])

  broker.on('to_worker', async event => {
    console.debug({
      msg: 'main: sent to worker',
      eventName: event.eventName,
      modelName: event.modelName,
      modelId: event.modelId,
      eventTarget: event.eventTarget,
      eventSource: event.eventSource
    })

    port1.postMessage(
      JSON.parse(
        JSON.stringify({
          ...event,
          model: null, // use shared mem
          modelId: event.model?.modelId,
          modelName: event.model?.modelName
        })
      )
    )
  })

  port1.onmessage = async event => {
    console.debug({
      msg: 'main: received from worker',
      eventName: event.data?.eventName,
      modelName: event.data?.modelName,
      eventTarget: event.data?.eventTarget,
      eventSource: event.data?.eventSource,
      model: event.data?.model
    })

    await broker.notify('from_worker', {
      ...event.data,
      model: null,
      modelId: event.data?.modelId,
      modelName: event.data?.modelName
    })
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
    try {
      const channel = new MessageChannel()
      const worker = new Worker(file, { workerData })
      setEnvironmentData('modelName', pool.name)
      pool.workerRef.push(worker)
      pool.totalThreads++

      const thread = {
        file,
        pool,
        worker,
        eventPort: channel.port1,
        id: worker.threadId,
        createdAt: Date.now(),
        async stop () {
          await kill(this)
        }
      }
      setTimeout(reject, 10000)

      worker.once('message', msg => {
        connectEventChannel(worker, channel)
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
 * @param {{l
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
    const startTime = Date.now()

    thread.worker.once('message', result => {
      pool.jobTime(Date.now() - startTime)

      if (pool.waitingJobs.length > 0) {
        pool.waitingJobs.shift()(thread)
      } else {
        pool.freeThreads.push(thread)
      }

      if (pool.noJobsRunning()) {
        pool.emit('noJobsRunning')
      }

      if (cb) return resolve(cb(result))
      return resolve(result)
    })
    thread.worker.once('error', reject)
    thread.worker.postMessage({ name: jobName, data: jobData })
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
    this.workerRef = []
    this.startTime = Date.now()

    function dequeue () {
      if (this.freeThreads.length > 0 && this.waitingJobs.length > 0) {
        this.waitingJobs.shift()(this.freeThreads.shift())
      }
    }

    setInterval(dequeue.bind(this), 1500)

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

  thresholdExceeded (pool = this) {
    const thresholds = {
      zeroThreads () {
        return pool.poolSize() === 0
      },
      queueRate () {
        return pool.jobQueueRate() > pool.jobQueueThreshold()
      },
      duration () {
        return pool.avgJobDuration() > pool.jobDurationThreshold()
      }
    }
    return (
      Object.values(thresholds).some(exceeded => exceeded()) &&
      pool.capacityAvailable()
    )
  }

  async threadAlloc () {
    if (this.thresholdExceeded()) return this.startThread()
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
              console.error({ fn: this.run.name, error })
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

  async fireEvent (event, retries = 0) {
    return new Promise((resolve, reject) => {
      // don't retry forever
      if (retries > EVENTCHANNEL_MAXRETRY) {
        console.error('event channel retry timeout', event)
        return reject('timeout')
      }
      const threads = this.freeThreads
      if (!threads || threads.length < 1) return reject('no threads')
      const thread = threads[0]

      if (thread) {
        // don't send to the sender (infinite loop)
        if (event.port === thread.eventPort) return
        // return the response
        thread.eventPort.once('message', msgEvent => resolve(msgEvent))
        // send over thread's event subchannel
        console.log('sending', event)
        thread.eventPort.postMessage(event)
      } else {
        // all threads busy, keep trying
        setTimeout(this.fireEvent, 1000, event, retries++)
      }
    })
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
        async workerRef => {
          await Promise.all(kill.map(async thread => thread.stop()))
          // keep pointers until threads are stopped
          workerRef.splice(0, workerRef.length)
        },
        1000,
        this.workerRef
      )

      return this
    } catch (error) {
      console.error({ fn: this.stopThreads.name, error })
    }
  }

  reset () {
    try {
      this.workerRef.forEach(worker => worker.terminate())
    } catch (error) {}
  }
}

/**
 * Create, reload, destroy, observe & report on thread pools.
 */
const ThreadPoolFactory = (() => {
  /** @type {Map<string, ThreadPool>} */
  let threadPools = new Map()

  /**
   * By default the system-wide thread upper limit is the total # of cores.
   * The default behavior is to spread threads/cores evenly between models.
   * @param {*} options
   * @returns
   */
  function determineMaxThreads (options) {
    if (options?.maxThreads) return options.maxThreads
    const nApps = ModelFactory.getModelSpecs().filter(s => !s.isCached).length
    return (
      Math.floor(os.cpus().length / (nApps || DEFAULT_THREADPOOL_MAX || 2)) || 1
    )
  }

  /**
   * Creates a pool for use by a domain {@link Model}.
   * Provides a thread-safe {@link SharedMap} for parallel
   * access to the same memory by all threads.
   *
   * @param {string} modelName named after the {@link Model} using it
   * @param {{preload:boolean, waitingJobs:function(Thread)[]}} options
   * @returns
   */
  function createThreadPool (modelName, options) {
    console.debug({ fn: createThreadPool.name, modelName, options })

    const maxThreads = determineMaxThreads()
    console.log(modelName)
    const sharedMap = DataSourceFactory.getDataSource(modelName).dsMap

    try {
      const pool = new ThreadPool({
        file: './dist/worker.js',
        name: modelName,
        workerData: { modelName, sharedMap },
        options: { ...options, maxThreads }
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
      fireEvent (input) {
        return getPool(poolName, options).fireEvent(input)
      }
    }

    return options.preload ? getPool(poolName, options) : facade
  }

  /**
   * post a message to all pools (at least one thread)
   * eee
   * @param {import('./event').Event} event
   */
  function fireAll (event) {
    threadPools.forEach(pool => pool.fireEvent(event))
  }

  async function fireEvent (event) {
    const pool = threadPools.get(event.data)
    if (pool) return pool.fireEvent(event)
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
        .map(async poolName => await ThreadPoolFactory.destroy(poolName))
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
        .then(pool => pool.stopThreads())
        .then(pool => resolve(threadPools.delete(pool)))
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

      // work is waiting but no workers available
      if (workWaiting > 0 && workersAvail < 1) {
        setTimeout(() => {
          const workRequested2 = pool.totalTransactions()
          const workWaiting2 = pool.jobQueueDepth()
          const workersAvail2 = pool.availThreadCount()

          if (workWaiting2 > 0 && workersAvail2 < 1) {
            // has any work been done in the last minute?
            if (workWaiting2 - workWaiting === workRequested2 - workRequested) {
              // no, kill whatever's running - thread is stuck
              pool.reset()
            }
          }
        }, 60000)
      }
    })
  }, 90000)

  return Object.freeze({
    getThreadPool,
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

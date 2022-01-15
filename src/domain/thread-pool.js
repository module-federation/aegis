'use strict'

import { clear } from 'console'
import { resolve } from 'path/posix'
import { EventEmitter } from 'stream'
import {
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
// function metadataMatch (metaCriteria, thread) {
//   return Object.keys(metaCriteria).every(k =>
//     thread.metadata[k] ? metaCriteria[k] === thread.metadata[k] : true
//   )
// }

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
  return new Promise(resolve => {
    console.log('kill thread', thread.threadId)
    thread.pool.freeThreads = [
      ...thread.pool.freeThreads.filter(t => t.threadId !== thread.threadId)
    ]
    thread.worker.once('exit', resolve)
    thread.worker.postMessage({ name: 'shutdown' })
  })
}

/**
 * @param {ThreadPool} pool
 * @returns {Thread}
 */
function newThread (pool, file, workerData) {
  console.debug(newThread.name, 'creating new thread')
  const worker = new Worker(file, { workerData })
  return {
    pool,
    worker,
    threadId: worker.threadId,
    createdAt: Date.now(),
    async stop () {
      return pool.killThread(this)
    },
    toJSON () {
      return {
        ...this,
        createdAt: new Date(this.createdAt).toUTCString()
      }
    }
  }
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
function handleJob (pool, taskName, taskData, thread, cb) {
  return new Promise((resolve, reject) => {
    thread.worker.once('message', async result => {
      if (pool.waitingJobs.length > 0) {
        await pool.waitingJobs.shift()(thread)
      } else {
        pool.freeThreads.push(thread)
      }
      if (pool.waitingJobs.length < 1) {
        pool.emit('allThreadsFree')
      }
      if (cb) cb(result)
      resolve(result)
    })
    thread.worker.on('error', reject)
    thread.worker.postMessage({ name: taskName, data: taskData })
  })
}

export class ThreadPool extends EventEmitter {
  constructor ({
    file,
    name = null,
    workerData = {},
    numThreads = DEFAULT_THREADPOOL_SIZE,
    options = {}
  } = {}) {
    super(options)
    this.freeThreads = []
    this.waitingJobs = []
    this.file = file
    this.name = name
    this.workerData = workerData
    this.numThreads = numThreads

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
  createThread (file = this.file, workerData = this.workerData) {
    this.freeThreads.push(newThread(this, file, workerData))
  }

  pause () {
    this._pause = true
  }

  paused () {
    return this._pause
  }

  play () {
    this._pause = false
  }

  async actOnThreads (cb) {
    await Promise.all(this.freeThreads.map(async thread => await cb(thread)))
    this.play()
  }

  allThreadsFree () {
    return this.waitingJobs.length < 1
  }

  /**
   * Pause pool, drain tasks untill all threads
   * are free, the run a callback on all of them
   * @param {function():Promise} cb
   * @returns {Promise}
   */
  async allThreads (cb) {
    return new Promise((resolve, reject) => {
      try {
        this.pause()
        if (this.allThreadsFree()) {
          resolve(this.actOnThreads(cb))
        } else {
          this.once('allThreadsFree', () => resolve(this.actOnThreads(cb)))
        }
      } catch (e) {
        console.error(e)
        reject(e)
      } finally {
        this.play()
      }
    })
  }

  /**
   *
   * @param {Thread|string} thread threadId or thread itself
   * @returns
   */
  async killThreadById (threadId) {
    try {
      if (threadId) {
        const thread = this.freeThreads.find(t => t.threadId === threadId)
        if (thread) {
          await kill(thread)
          return true
        }
      }
      return false
    } catch (e) {
      console.error(this.killThread.name, e.message)
    }
  }

  async killThread (thread) {
    if (thread) {
      await kill(thread)
      return true
    }
    let _thread = this.freeThreads.shift()
    if (_thread) {
      await kill(_thread)
      return true
    }
    return false
  }

  threadPoolSize () {
    return this.freeThreads.length + this.waitingJobs.length
  }

  taskQueueDepth () {
    return this.waitingJobs.length
  }

  getFreeThreads () {
    return this.freeThreads
  }

  status () {
    return {
      total: this.threadPoolSize(),
      waiting: this.taskQueueDepth(),
      available: this.threadPoolSize() - this.taskQueueDepth(),
      performance: this.freeThreads.map(t => t.worker.performance)
    }
  }

  /**
   *
   * @param {*} jobName
   * @param {*} jobData
   * @returns {Promise<any>}
   */
  runJob (jobName, jobData) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.paused()) {
          let thread = this.freeThreads.shift()
          if (thread) {
            const result = await handleJob(this, jobName, jobData, thread)
            resolve(result)
            return
          }
        }
        this.waitingJobs.push(thread =>
          handleJob(this, jobName, jobData, thread, result => resolve(result))
        )
      } catch (error) {
        console.log(error)
        reject(error)
      }
    })
  }
}

const ThreadPoolFactory = (() => {
  let threadPools = new Map()

  function createThreadPool (modelName) {
    console.debug(createThreadPool.name)

    const pool = new ThreadPool({
      file: './dist/worker.js',
      name: modelName,
      workerData: { modelName },
      numThreads: DEFAULT_THREADPOOL_SIZE
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
  function getThreadPool (modelName) {
    if (threadPools.has(modelName)) return threadPools.get(modelName)
    return createThreadPool(modelName)
  }

  /**
   *
   * @param {ThreadPool} pool
   * @returns {Promise<boolean>}
   */
  async function clear (pool) {
    await pool.allThreads(async thread => await thread.stop())
    const newPool = [...threadPools].filter(([k]) => k !== pool.name)
    console.debug('new pool', newPool)
    threadPools = new Map(newPool)
    return true
  }

  /**
   *
   * @param {string} pool
   * @returns {Promise<boolean>}
   */
  async function clearByName (poolName) {
    const pool = threadPools.get(poolName)
    if (pool) {
      await clear(pool)
      return true
    }
    return false
  }

  async function clearAll () {
    await Promise.all(threadPools.map(pool => clear(pool)))
    threadPools = new Map()
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  return {
    getThreadPool,
    listPools,
    status,
    clearAll,
    clearByName,
    clear
  }
})()

export default ThreadPoolFactory

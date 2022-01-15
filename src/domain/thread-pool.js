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
function _stop (thread) {
  return new Promise(resolve => {
    console.log('kill thread', thread.threadId)
    thread.pool.availThreads = [
      ...thread.pool.availThreads.filter(t => t.threadId !== thread.threadId)
    ]
    thread.worker.once('exit', resolve)
    thread.worker.postMessage({ name: 'shutdown' })
  })
}

/**
 * @param {ThreadPool} pool
 * @returns {Thread}
 */
function _newThread (pool, file, workerData) {
  console.debug(_newThread.name, 'creating new thread')
  const worker = new Worker(file, { workerData })
  return {
    pool,
    worker,
    threadId: worker.threadId,
    createdAt: Date.now(),
    async stop () {
      return pool.stopThread(this)
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
function _handleRequest (pool, taskName, taskData, thread, cb) {
  return new Promise((resolve, reject) => {
    thread.worker.once('message', async result => {
      if (pool.waitingTasks.length > 0) {
        await pool.waitingTasks.shift()(thread)

        if (pool.waitingTasks.length < 1) {
          pool.emit('allThreadsFree')
        }
      } else {
        pool.availThreads.push(thread)
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
    this.availThreads = []
    this.waitingTasks = []
    this.file = file
    this.name = name
    this.workerData = workerData
    this.numThreads = numThreads

    for (let i = 0; i < numThreads; i++) {
      this.availThreads.push(_newThread(this, file, workerData))
    }
    console.debug('threads in pool', this.availThreads.length)
  }

  /**
   *
   * @param {string} file
   * @param {*} workerData
   * @returns {Thread}
   */
  addThread (file = this.file, workerData = this.workerData) {
    this.availThreads.push(_newThread(this, file, workerData))
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
    await Promise.all(this.availThreads.map(async thread => await cb(thread)))
    this.play()
  }

  allThreadsFree () {
    return this.waitingTasks.length < 1
  }

  async allThreads (cb) {
    return new Promise((resolve, reject) => {
      try {
        this.pause()
        if (this.allThreadsFree()) {
          resolve(this.actOnThreads(cb))
        } else {
          this.on('allThreadsFree', () => resolve(this.actOnThreads(cb)))
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
  async stopThreadById (threadId) {
    try {
      if (threadId) {
        const thread = this.availThreads.find(t => t.threadId === threadId)
        if (thread) {
          await _stop(thread)
          return true
        }
      }
      return false
    } catch (e) {
      console.error(this.stopThread.name, e.message)
    }
  }

  async stopThread (thread) {
    if (thread) {
      await _stop(thread)
      return true
    }
    let _thread = this.availThreads.shift()
    if (_thread) {
      await _stop(_thread)
      return true
    }
    return false
  }

  threadPoolSize () {
    return this.availThreads.length + this.waitingTasks.length
  }

  taskQueueDepth () {
    return this.waitingTasks.length
  }

  freeThreads () {
    return this.availThreads
  }

  status () {
    return {
      total: this.threadPoolSize(),
      waiting: this.taskQueueDepth(),
      available: this.threadPoolSize() - this.taskQueueDepth(),
      performance: this.availThreads.map(t => t.worker.performance)
    }
  }

  /**
   *
   * @param {*} taskName
   * @param {*} taskData
   * @returns {Promise<any>}
   */
  runTask (taskName, taskData) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.paused()) {
          let thread = this.availThreads.shift()
          if (thread) {
            const result = await _handleRequest(
              this,
              taskName,
              taskData,
              thread
            )
            resolve(result)
            return
          }
        }
        this.waitingTasks.push(thread =>
          _handleRequest(this, taskName, taskData, thread, result =>
            resolve(result)
          )
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
   * @param {ThreadPool|string} pool
   * @returns
   */
  async function clear (pool) {
    let _pool = pool

    if (typeof pool === 'string') {
      _pool = threadPools.get(pool)
      if (!_pool) return false
    }

    await _pool.allThreads(async thread => await thread.stop())
    threadPools = new Map([...threadPools].filter(([k]) => k !== _pool.name))
    return true
  }

  async function clearAll () {
    await Promise.all(threadPools.map(pool => clear(pool)))
    threadPools = new Map()
  }

  async function reloadAll () {
    await clearAll()
    ModelFactory.getModelSpecs().forEach(spec =>
      createThreadPool(spec.modelName)
    )
  }

  async function reload (poolName) {
    return new Promise(async resolve => {
      if (threadPools.has(poolName)) {
        const pool = threadPools.get(poolName)
        await clear(pool)

        setTimeout(
          () =>
            threadPools.set(poolName, createThreadPool(poolName)) && resolve(),
          5000
        )
      }
    })
  }

  function status () {
    const reports = []
    threadPools.forEach(pool => reports.push(pool.status()))
    return reports
  }

  return {
    getThreadPool,
    listPools,
    reloadAll,
    reload,
    status,
    clearAll,
    clear
  }
})()

export default ThreadPoolFactory

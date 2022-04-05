const { isMainThread, Worker } = require('worker_threads')

if (!isMainThread) {
  const { publish } = require('./test')

  setTimeout(publish, 10000, 'hi')
} else {
  new Worker(__filename)
  const { subscribe } = require('./test')
  subscribe(event => console.log('callback', message))
}

const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads')

if (isMainThread) {
  const { port1, port2 } = new MessageChannel()
  port1.once('message', msg => console.log(msg))
  const worker = new Worker(__filename)
  worker.postMessage({ port2 }, [port2])
} else {
  parentPort.once('message', msg => msg.port2.postMessage('this is a worker'))
}

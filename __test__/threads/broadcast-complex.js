const {
  Worker,
  isMainThread,
  workerData,
  BroadcastChannel,
} = require('worker_threads')

if (isMainThread) {
  const bc = new BroadcastChannel('main')

  const workers = []
  for (let i = 0; i < 3; i++)
    workers.push(new Worker(__filename, { workerData: { name: i } }))

  setTimeout(() => {
    bc.postMessage('from main')
    setTimeout(() => process.exit(), 300)
  }, 300)
} else {
  const bc = new BroadcastChannel('main')
  bc.onmessage = message => {
    console.log(`worker ${workerData.name} received message`, message.data)
    bc.close()
  }
}

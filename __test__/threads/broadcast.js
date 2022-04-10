const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
  BroadcastChannel
} = require('worker_threads')

from_main = 'from_main'
from_order = 'from_ordera'

const mainBc = new BroadcastChannel(from_main)
const orderBc = new BroadcastChannel(from_order)

if (isMainThread) {
  setTimeout(() => mainBc.postMessage('this is from main'), 3000)
  orderBc.onmessage = msg => console.log(msg.data)

  for (let i = 0; i < 3; i++)
    new Worker(__filename, { workerData: { name: i } })
} else {
  mainBc.onmessage = msg => console.log(msg.data)
  orderBc.postMessage(`this is from order thread ${workerData.name}`)
}

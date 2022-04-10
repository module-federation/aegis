const SharedMap = require('sharedmap')
const {
  isMainThread,
  Worker,
  workerData,
  parentPort
} = require('worker_threads')

const MAPSIZE = 128 * 1024
// Size is in UTF-16 codepoints
const KEYSIZE = 48
const OBJSIZE = 16
const NWORKERS = require('os').cpus().length

if (isMainThread) {
  const myMap = new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE)
  myMap.set('prop1', 'val1')
  myMap.set('prop2', 'val2')
  const worker = new Worker(__filename, { workerData: { map: myMap } })

  worker.once('message', () => console.log(myMap.get('propx')))
  worker.postMessage({ prop: 'propx' })
  console.log(myMap.map(v => v))

  //   const workers = new Array(NWORKERS).fill(undefined)

  //   for (let w in workers) {
  //     workers[w] = new Worker(__filename, { workerData: { map: myMap } })
  //   }
} else {
  const myMap = workerData.map
  Object.setPrototypeOf(myMap, SharedMap.prototype)

  console.assert(myMap.get('prop1') == 'val1')
  console.log(myMap.get('prop1'))

  for (let k of myMap.keys()) console.log(myMap.get(k))

  console.log(myMap.length)

  console.log('keys', Array.from(myMap.keys()))
  console.log(
    'vals',
    myMap.map(v => v)
  )

  parentPort.once('message', msg => {
    console.log('here' + msg.data)
    // myMap.set(msg.data.prop, 9)
    parentPort.postMessage('done')
  })
  //   // You can also send it through a MessagePort
  //   const myMap = workerData.map

  //   // You have to manually restore the prototype
  //   Object.setPrototypeOf(myMap, SharedMap.prototype)

  //   myMap.set('prop1', 'val1')
  //   myMap.set('prop2', 12)

  //   // Numbers will be converted to strings
  //   console.assert(myMap.get('prop1') == 'val1')
  //   console.assert(myMap.get('prop2') == '12')

  //   // You can store objects if you serialize them
  //   myMap.set('prop3', JSON.stringify('a'))

  //   //myMap.delete('prop2')
  //   //console.assert(myMap.hash('prop2') == false)
  //   console.assert(myMap.length === 1)

  //   // SharedMap.keys() is a generator
  //   // could fail if another thread deletes k under our nose
  //   for (let k of myMap.keys()) console.assert(myMap.has(k))

  //   myMap.lockWrite()
  //   // will never fail, but locks out writers
  //   for (let k of myMap.keys()) console.assert(myMap.has(k))
  //   myMap.unlockWrite()

  //   // Both are thread-safe without lock, but there could
  //   // be values added/deleted/modified while the operation runs
  //   // These operations will be atomic, so all values read will
  //   // be coherent
  //   // map.get(key)=currentValue is guaranteed while the callback runs
  //   //
  //   // Don't manipulate the map in the callback, see the explicit locking
  //   // example below if you need to do it
  //   const sum = map.reduce((a, x) => (a += +x), 0)
  //   const allKeys = Array.from(myMap.keys())

  //   // Update with explicit locking
  //   // Other threads can continue reading, set operations will be atomic
  //   // In real-life you will also handle the exceptions
  //   myMap.lockWrite()
  //   for (let k of myMap.keys({ lockWrite: true }))
  //     myMap.set(k, myMap.get(k, { lockWrite: true }).toUpperCase(), {
  //       lockWrite: true
  //     })
  //   myMap.unlockWrite()

  //   myMap.clear()
}

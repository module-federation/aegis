// 'use strict'

// import { DataSourceMemory } from '.'
// import { SharedMap } from 'sharedmap'
// import { isMainThread, parentPort } from 'worker_threads'
// import ModelFactory, { EventBrokerFactory } from '../../domain'
// import pipe from '../../domain/util/pipe'

// const MAPSIZE = 128 * 1024 * 1024
// // Size is in UTF-16 codepoints
// const KEYSIZE = 48
// const OBJSIZE = 16

// /**
//  * Use for I/O w/ shared array buffer. Accepts object,
//  * serializes to JSON, then decodes string and writes
//  * to shared int array. Reads from shared int array.
//  * decodes to JSON string, parses JSON and optionally
//  * rehydrates object. Keeps a cache of shared array
//  * of fully hydrated objects in local memory.
//  */
// export class DataSourceSharedMem extends DataSourceMemory {
//   constructor (params) {
//     super(params)
//     this.dataSource = new SharedMap(MAPSIZE, KEYSIZE, OBJSIZE)
//   }

//   shareWithChild () {
//     parentPort.postMessage({ name: 'sharedMemory', data: this.dataSource }, [
//       this.dataSource
//     ])
//   }

//   receiveFromParent () {
//       parentPort.once('message', eventMsg=> {
//           if (eventMsg.name === 'sharedMem')
//       })
//   }
//   /**
//    * @override
//    */
//   async save (id, data) {
//     const serDat = JSON.stringify(data)
//     return super.save(id, serDat)
//   }

//   async find (id) {
//     const model = pipe(super.find, JSON.parse)(id)

//     if (isMainThread) {
//       // return deserialized
//       return model
//     } else {
//       // return fully hydrated
//       return ModelFactory.loadModel(
//         EventBrokerFactory.getInstance(),
//         this,
//         model,
//         model.modelName
//       )
//     }
//   }

//   async list (filter) {
//     // do not fully hydrate by default
//     const list = await super.list(filter)
//     return list.map(v => JSON.parse(v))
//   }

//   listSync (filtr) {
//     // do not fully hydrate by default
//     const list = super.listSync(filter)
//     return list.map(v => JSON.parse(v))
//   }
// }

'use strict'
// import crypto from 'crypto'
// import { StringEncoder } from './util/encoder'

const domainEvents = {
  internalCacheRequest: modelName => `internalCacheRequest_${modelName}`,
  externalCacheRequest: modelName => `externalCacheRequest_${modelName}`,
  internalCacheResponse: modelName => `internalCacheResponse_${modelName}`,
  externalCacheResponse: modelName => `externalCacheResponse_${modelName}`,
  externalCrudEvent: eventName => `externalCrudEvent_${eventName}`,
  cacheCreateEvent: modelName => `cacheCreateEvent_${modelName}`,
  cacheUpdateEvent: modelName => `cacheUpdateEvent_${modelName}`,
  unauthorizedCommand: modelName => `unauthorizedCommand_${modelName}`,
  undoStarted: modelName => `undoStart_${modelName}`,
  undoFailed: modelName => `undoFailed_${modelName}`,
  undoWorked: modelName => `undoWorked_${modelName}`,
  addModel: modelName => `addModel_${modelName}`,
  editModel: modelName => `editModel_${modelName}`,
  portTimeout: (modelName, port) => `portTimeout_${port}_${modelName}`,
  portRetryFailed: (modelName, port) => `portRetryFailed_${port}_${modelName}`,
  portRetryWorked: (modelName, port) => `portRetryWorked_${port}_${modelName}`,
  wasmPublishEvent: modelName => `wasmPublishEvent_${modelName}`,
  forwardEvent: () => '__FWD_EVENT__',
  webswitchTimeout: () => `webswitchTimeout`
}

// function sha1 (data) {
//   return crypto
//     .createHash('sha1')
//     .update(data)
//     .digest('hex')
// }

// function numHash (str) {
//   let hash = 0
//   let i
//   let chr
//   if (str.length === 0) return hash
//   for (i = 0; i < str.length; i++) {
//     chr = str.charCodeAt(i)
//     hash = (hash << 5) - hash + chr
//     hash |= 0 // Convert to 32bit integer
//   }
//   return hash
// }

// function makeDomainEvents (Events) {
//   return Object.entries(Events)
//     .map(function ([k, fn]) {
//       return {
//         [k]: function (...args) {
//           const name = fn(...args)
//           return {
//             name,
//             /**
//              * keep under 0xffff (65535)
//              * @returns
//              */
//             numericHash () {
//               return Math.abs(parseInt(numHash(name) % 10000))
//             },
//             sha1Hash () {
//               return sha1(name)
//             },
//             encode () {
//               return StringEncoder.encode(name)
//             }
//           }
//         }
//       }
//     })
//     .reduce((p, c) => ({ ...p, ...c }))
// }

// const domainEvents = makeDomainEvents(Events)

// const hashes = new Set()
// Object.entries(domainEvents).forEach(([k, v]) => {
//   try {
//     hashes.add(v('order').numericHash())
//   } catch (error) {
//     console.warn('repeat hash test', k, error)
//   }
// })
// //console.log(domainEvents)
// console.assert(
//   hashes.size < Object.keys(domainEvents).length,
//   'repeat hashes exist in domainEvents'
// )

export default domainEvents

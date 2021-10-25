'use strict'
import crypto from 'crypto'
// import { StringEncoder } from './util/encoder'

function bytesToHex (bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes (hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i !== bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export const StringEncoder = {
  /**
   * Get the integer value of the string
   * @param {string} str string to encode
   * @returns
   */
  encode: str => parseInt(bytesToHex(new TextEncoder().encode(str)), 16),
  /**
   * Get the UTF8 string value of the previously encoded integer
   * @param {number} num previously encoded value
   * @returns
   */
  decode: num => new TextDecoder().decode(hexToBytes(num.toString(16)))
}

const Events = {
  internalCacheRequest: modelName => `internalCacheRequest_${modelName}`,
  externalCacheRequest: modelName => `externalCacheRequest_${modelName}`,
  internalCacheResponse: modelName => `internalCacheResponse_${modelName}`,
  externalCacheResponse: modelName => `externalCacheResponse_${modelName}`,
  externalCrudEvent: eventName => `externalCrudEvent_${eventName}`,
  cacheCreateEvent: modelName => `cacheCreateEvent_${modelName}`,
  cacheUpdateEvent: modelName => `cacheUpdateEvent_${modelName}`,
  unauthorizedCommand: modelName => `unauthorizedCommand_${modelName}`,
  undoStarted: model => `undoStart_${model.getName()}`,
  undoFailed: model => `undoFailed_${model.getName()}`,
  undoWorked: model => `undoWorked_${model.getName()}`,
  addModel: modelName => `addModel_${modelName}`,
  editModel: modelName => `editModel_${modelName}`,
  portTimeout: (model, port) => `portTimeout_${port}_${model.getName()}`,
  portRetryFailed: (model, port) =>
    `portRetryFailed_${port}_${model.getName()}`,
  portRetryWorked: (model, port) =>
    `portRetryWorked_${port}_${model.getName()}`,
  wasmPublishEvent: modelName => `wasmPublishEvent_${modelName}`,
  forwardEvent: () => '__FWD_EVENT__',
  webswitchTimeout: () => `webswitchTimeout`
}

function sha1 (data) {
  return crypto
    .createHash('sha1')
    .update(data)
    .digest('hex')
}

function numHash (str) {
  var hash = 0,
    i,
    chr
  if (str.length === 0) return hash
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

function makeDomainEvents (Events) {
  return Object.entries(Events)
    .map(function ([k, fn]) {
      return {
        [k]: function (...args) {
          const name = fn(...args)
          return {
            name,
            numericHash () {
              return Math.abs(parseInt(numHash(name) % 10000))
            },
            sha1Hash () {
              return sha1(name)
            },
            encode () {
              return StringEncoder.encode(name)
            }
          }
        }
      }
    })
    .reduce((p, c) => ({ ...p, ...c }))
}

const domainEvents = makeDomainEvents(Events)

const hashes = new Set()
function run (fn = null) {
  Object.entries(domainEvents).forEach(([k, v]) => {
    try {
      hashes.add(v('order').numericHash())
      console.log(k, 'name:', v('order').name)
      console.log(k, 'hash:', v('order').numericHash())
      console.log(k, 'less than:', 0xffff, v('order').numericHash() < 0xffff)
      console.log(v('order').numericHash() % 10000)
      console.log(v('order').numericHash() % 10000 < 0xffff)
      console.log(v('order').sha1Hash())
    } catch (error) {}
  })
}
run()

//run(domainEvents.decode)
console.log(domainEvents)

console.assert(
  hashes.size < Object.keys(domainEvents).length,
  'repeat hashes exist in domainEvents'
)

export default domainEvents

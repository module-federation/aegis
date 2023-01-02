'use strict'

1
/** @type {WebSocket} */
let socket
const useBinary = () => socket.binaryType === 'arraybuffer'

/**
 * use binary messages
 */
const primitives = {
  encode: {
    object: msg => Buffer.from(JSON.stringify(msg)),
    string: msg => Buffer.from(JSON.stringify(msg)),
    number: msg => Buffer.from(JSON.stringify(msg)),
    symbol: msg => console.error('unsupported', msg),
    undefined: msg => console.error('undefined', msg)
  },
  decode: {
    object: msg => JSON.parse(Buffer.from(msg).toString()),
    string: msg => JSON.parse(Buffer.from(msg).toString()),
    number: msg => JSON.parse(Buffer.from(msg).toString()),
    symbol: msg => console.error('unsupported', msg),
    undefined: msg => console.error('undefined', msg)
  }
}

export function websocketConnect () {
  return function ({ args: [url, options] }) {
    if (socket) return socket
    if (url) {
      socket = new WebSocket(url, options)
      console.debug('connected', url)
      if (options.useBinary) socket.binaryType = 'arraybuffer'
      return socket
    }
    throw new Error('missing url', url)
  }
}

function encode (msg) {
  if (useBinary()) return primitives.encode[typeof msg](msg)
  return msg
}

function decode (msg) {
  if (useBinary()) return primitives.decode[typeof msg](msg)
  return msg
}

export function websocketSend () {
  return function ({ args: [msg, options = {}] }) {
    if (
      socket &&
      socket.readyState === socket.OPEN &&
      socket.bufferedAmount < 1
    ) {
      socket.send(
        encode(msg),
        useBinary() ? { ...options, binary: true } : options
      )
      return true
    }
    return false
  }
}

export function websocketClose () {
  return function ({ args: [code, reason] }) {
    if (socket) return socket.close(code, reason)
  }
}

export function websocketPing () {
  return function ({ args: [options] }) {
    if (socket) return socket.ping(options)
  }
}

export function websocketOnMessage () {
  return function ({ args: [callback] }) {
    if (socket) return socket.on('message', msg => callback(decode(msg)))
  }
}

export function websocketOnClose () {
  return function ({ args: [callback] }) {
    if (socket) socket.onclose = callback
  }
}

export function websocketOnOpen () {
  return async function ({ args: [callback] }) {
    if (socket) socket.onopen = callback
  }
}

export function websocketOnPong () {
  return function ({ args: [callback] }) {
    if (socket) socket.on('pong', callback)
  }
}

export function websocketStatus () {
  return function ({ args: [callback] }) {
    if (socket) return socket.readyState
  }
}

export function websocketOnError () {
  return function ({ args: [callback] }) {
    if (socket) return socket.on('error', callback)
  }
}

export function websocketTerminate () {
  return function () {
    if (socket) return socket.terminate()
  }
}

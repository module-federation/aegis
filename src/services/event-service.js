'use strict'


const handlers = new Map()
export const Event = {

  on (eventName, callback) {
    if (handlers.has(eventName)) {
      handlers.get(eventName).push(callback)
    }
    handlers.set(eventName, [callback])
  },

  notify (eventName, data) {
    
  }
}
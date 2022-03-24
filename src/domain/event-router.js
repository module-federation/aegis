'use strict'

/**
 * update event with `eventTarget`
 */
export const EventRouter = (() => {
  const eventCatalog = new Map()

  return {
    addEvents (pool, events) {
      eventCatalog.set(pool, events)
    },

    listEvents () {
      return [...eventCatalog].map(([k, v]) => v.map(v => v.eventName))
    },

    route (event) {
      const target = [...eventCatalog].map(([k, v]) => {
        if (v.find(v => v.eventName === event.eventName)) return k
      })[0]

      return {
        ...event,
        eventTarget: target
      }
    }
  }
})()

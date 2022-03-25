'use strict'

const eventCatalog = new Map()

/**
 * update event with `eventTarget`
 * @param {{
 *  models:import('./model-factory.js').ModelFactory
 *  threadpools:import('./thread-pool.js').default
 * }}
 */
export const EventRouter = ({ models, threadpools }) => {
  console.debug(listEvents())

  setInterval(
    (models, threadpools) => {
      try {
        models.getModelSpecs().forEach(spec => {
          const pools = threadpools.listPools()
          pools.forEach(async poolName => {
            console.debug({ poolName })
            const pool = threadpools.getThreadPool(poolName)
            console.debug({ pool })
            if (pool) {
              const events = await pool.fireEvent({
                name: 'showEvents',
                data: poolName
              })
              eventCatalog.set(poolName, events)
            }
          })
        })
      } catch (error) {
        console.error(error)
      }
    },
    9000,
    models,
    threadpools
  )

  function addEvents (pool, events) {
    eventCatalog.set(pool, events)
  }

  function listEvents () {
    return [...eventCatalog].map(([, v]) => v.map(v => v.eventName))
  }

  function route (event) {
    const target = [...eventCatalog].map(([k, v]) => {
      if (v.find(v => v.eventName === event.eventName)) return k
    })[0]

    return {
      ...event,
      eventTarget: target
    }
  }

  return Object.freeze({
    addEvents,
    listEvents,
    route
  })
}

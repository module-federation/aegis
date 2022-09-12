'use strict'

import { WritableStream } from 'stream/web'

const qpm = require('query-params-mongo')
const mongodb = require('mongodb')

const processQuery = qpm({
  autoDetect: [{ fieldPattern: /_id$/, dataType: 'objectId' }],
  converters: { objectId: mongodb.ObjectId }
})

// const DateFunctions = {
//   today: list =>
//     list.filter(m => new Date(m.createTime).getDate() === new Date().getDate())
//       .length,
//   yesterday: list =>
//     list.filter(
//       m => new Date(m.createTime).getDate() === new Date().getDate() - 1
//     ).length,
//   thisMonth: list =>
//     list.filter(
//       m => new Date(m.createTime).getMonth() === new Date().getMonth()
//     ).length,
//   lastMonth: list =>
//     list.filter(
//       m => new Date(m.createTime).getMonth() === new Date().getMonth() - 1
//     ).length
// }

// function dates (query, repository) {
//   console.debug(query)

//   if (dateFunc) {
//     const list = repository.listSync()
//     return {
//       count: dateFunc(list)
//     }
//   }
// }

/**
 *
 * @param {{
 *  writable:WritableStream,
 *  query,
 *  repository:import("../datasource").default
 * }}
 * @returns
 */
async function parseQuery ({ writable, query, repository }) {
  //if (writable) {
  const pq = query ? processQuery(query) : {}
  return repository.list({
    writable,
    cached: query ? query.cached : false,
    filter: query ? pq.filter : null,
    sort: query ? pq.sort : null,
    limit: query ? pq.limit : null,
    offset: query ? pq.offset : null,
    skip: query ? pq.skip : null
  })
  //}

  // const searchTerms = query.count.split(':')

  // const filter =
  //   searchTerms.length > 0 ? { [searchTerms[0]]: searchTerms[1] } : query

  // if (!Number.isNaN(parseInt(query.count)))
  //   return {
  //     filter,
  //     count: repository.listSync(filter).length
  //   }

  // if (query.count === 'all')
  //   return {
  //     total: await repository.count(),
  //     cached: repository.countSync(),
  //     bytes: repository.getCacheSizeBytes()
  //   }

  // return repository.listSync(filter)
}

/**
 * @callback listModels
 * @param {{key1:string, keyN:string}} query
 * @returns {Promise<Array<import("../model").Model)>>}
 *
 * @param {{repository:import('../datasource').default}}
 * @returns {listModels}
 */
export default function makeListModels ({ repository }) {
  return async function listModels ({ query, writable }) {
    return repository.list({ query, writable })

    // const pq = query ? processQuery(query) : {}

    // return repository.list({
    //   writable,
    //   cached: query ? query.cached : false,
    //   filter: query ? pq.filter : null,
    //   sort: query ? pq.sort : null,
    //   limit: query ? pq.limit : null,
    //   offset: query ? pq.offset : null,
    //   skip: query ? pq.skip : null
    // })
  }
}

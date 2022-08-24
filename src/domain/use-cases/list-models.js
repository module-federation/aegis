'use strict'

const DateFunctions = {
  today: list =>
    list.filter(m => new Date(m.createTime).getDate() === new Date().getDate())
      .length,
  yesterday: list =>
    list.filter(
      m => new Date(m.createTime).getDate() === new Date().getDate() - 1
    ).length,
  thisMonth: list =>
    list.filter(
      m => new Date(m.createTime).getMonth() === new Date().getMonth()
    ).length,
  lastMonth: list =>
    list.filter(
      m => new Date(m.createTime).getMonth() === new Date().getMonth() - 1
    ).length
}

/**
 *
 * @param {Writable} writable
 * @param {*} query
 * @param {import("../datasource").default} repository
 * @returns
 */
async function parseQuery (writable, query, repository) {
  //return Array.from(repository.dsMap.keys())

  // should we only search cached data?
  //const cached = query.cached || query.cacheOnly || false

  if (query?.count) {
    const dateFunc = DateFunctions[query.count]

    if (dateFunc) {
      const list = await repository.list(null, { cached: true })
      return {
        count: dateFunc(list)
      }
    }

    const searchTerms = query.count.split(':')

    if (searchTerms.length > 1) {
      const filter = { [searchTerms[0]]: searchTerms[1] }
      const filteredList = await repository.list(filter, { cached: true })

      const result = {
        ...filter,
        count: filteredList.length
      }

      return result
    }

    if (!Number.isNaN(parseInt(query.count))) {
      return repository.list(query, { cached: true })
    }

    return {
      total: await repository.count(),
      cached: repository.countSync(),
      bytes: repository.getCacheSizeBytes()
    }
  }
  return repository.list(query, { writable })
}

/**
 * @callback listModels
 * @param {{key1:string, keyN:string}} query
 * @returns {Promise<Array<import("../model").Model)>>}
 *
 * @param {{repository:import('../datasource').default}}
 * @returns {listModels}
 */
export default function makeListModels ({ repository } = {}) {
  return async function listModels ({ writable, query }) {
    return parseQuery(writable, query, repository)
  }
}

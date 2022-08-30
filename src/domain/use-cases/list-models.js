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
async function parseQuery ({
  writable,
  query,
  sort,
  aggregate,
  limit,
  repository
}) {
  if (query?.count) {
    const dateFunc = DateFunctions[query.count]

    if (dateFunc) {
      const list = repository.listSync()
      return {
        count: dateFunc(list)
      }
    }

    const searchTerms = query.count.split(':')

    if (searchTerms.length > 1) {
      const filter = { [searchTerms[0]]: searchTerms[1] }
      const filteredList = repository.listSync(filter)

      const result = {
        ...filter,
        count: filteredList.length
      }

      return result
    }

    if (!Number.isNaN(parseInt(query.count))) {
      return repository.listSync(query)
    }

    return {
      total: await repository.count(),
      cached: repository.countSync(),
      bytes: repository.getCacheSizeBytes()
    }
  }
  return repository.list({ filter: query, writable, sort, limit, aggregate })
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
  return async function listModels (options) {
    return parseQuery({ ...options, repository })
  }
}

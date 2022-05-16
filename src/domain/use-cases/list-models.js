'use strict'

import { read } from "fs"
import { Stream } from "stream"

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

function streamList(writeable, list) {
  const readable = Stream.Readable({ read() { } })
  readable.pipe(writeable)
  list.forEach(element => readable.push(element))
  readable.push(null)
}
/**
 *
 * @param {*} query
 * @param {import("../datasource").default} repository
 * @returns
 */
async function parseQuery(writeable, query, repository) {
  //return Array.from(repository.dsMap.keys())

  if (query?.count) {
    const dateFunc = DateFunctions[query.count]

    if (dateFunc) {
      const list = await repository.list(writeable)
      return {
        count: dateFunc(list)
      }
    }

    const searchTerms = query.count.split(':')

    if (searchTerms.length > 1) {
      const filter = { [searchTerms[0]]: searchTerms[1] }
      const filteredList = await repository.list(null, filter, true)
      
      const result= {
        ...filter,
        count: filteredList.length
      }

      streamList(writeable, [result])
    }

    if (!Number.isNaN(parseInt(query.count))) {
      return repository.list(writeable, query)
    }

    return {
      total: (await repository.list(writeable)).length,
      cached: repository.count(),
      bytes: repository.getCacheSizeBytes()
    }
  }
  return repository.list(writeable, query)
}

/**
 * @callback listModels
 * @param {{key1:string, keyN:string}} query
 * @returns {Promise<Array<import("../model").Model)>>}
 *
 * @param {{repository:import('../datasource').default}}
 * @returns {listModels}
 */
export default function makeListModels({ repository } = {}) {
  return async function listModels({ writeable, query }) {
    return parseQuery(writeable, query, repository)
  }
}

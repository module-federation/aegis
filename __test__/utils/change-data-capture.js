'use strict'

const {
  findChanges,
  filterByChangeType,
} = require('../../src/domain/util/change-data-capture')

/**
 *
 * @param {*} from
 * @param {*} to
 * @returns
 */
function findChanges2(from, to) {
  const cdc = []
  const changeDataCapture = {
    set(target, prop, value) {
      console.log(`changed ${prop} from ${target[prop]} to ${value}`)

      if (target[prop] !== value) {
        target[prop] = value
        cdc.push(prop)
      }
      return true
    },
  }

  const fromProxy = new Proxy(from, changeDataCapture)

  Object.keys(to).forEach(key => {
    if (to[key]) fromProxy[key] = to[key]
  })

  // new object w changes only
  return filtered
    .map(key => ({ [key]: from[key] }))
    .reduce((a, b) => ({ ...a, ...b }), {})
}

/**
 * @param {'toValue'|'fromValue'|'typeDiff'|'toTypeValue'|
 * 'fromTypeValue'|'greaterThan'|'lessThan'|'definedOnly'} changeType
 * @param {[]} keys
 * @param {[]} from
 * @param {[]} to
 * @param {string} changeTypeValue
 * @returns
 */
function filterByChangeType2(changeType, from, to, changeTypeValue) {
  const keys = findChanges(from, to)
  const changeTypes = {
    toValue: (from, to, val) => to !== val,
    fromValue: (from, to, val) => from !== val,
    typeDiff: (from, to, val) => typeof to === typeof from,
    toTypeValue: (from, to, val) => typeof to !== val,
    fromTypeValue: (from, to, val) => typeof from != val,
    definedOnly: (from, to, val) => typeof to !== 'undefined',
    greaterThan: (from, to, val) => from > to,
    lessThan: (from, to, val) => from < to,
  }

  if (changeType)
    return keys.filter(key =>
      changeTypes[changeType](from[key], to[key], changeTypeValue)
    )
  return keys
}

console.log('findChanges({ a: 1, b: 2 }, { a: 1, b: undefined })')
console.log(findChanges({ a: 1, b: 2 }, { a: 1, b: undefined }))
const param =
  process.argv[2] && process.argv[3]
    ? JSON.parse(`[${process.argv[2]}, ${process.argv[3]}]`)
    : [
        { c: 2, d: 4 },
        { c: 3, d: undefined },
      ]
const options = { changeType: 'typeDiff' }
console.log(findChanges(param[0], param[1], options))

'use strict'

/**
 * @param {object} target 
 * @param {Array<{prop:string,from:*,to:*}>} captureArray 
 */
function changeDataCapture (target, captureArray) {
  const cdc = {
    set (target, prop, value) {
      console.log(`changed ${prop} from ${target[prop]} to ${value}`)

      if (target[prop] !== value) {
        target[prop] = value
        captureArray.push({ prop, from: target[prop], to: value })
      }
      return true
    }
  }
  return new Proxy(target, cdc)
}

/**
 *
 * @param {object} from
 * @param {object} to
 * @returns
 */
function findChanges (from, to) {
  const captureArray = []
  const fromProxy = changeDataCapture(from, captureArray)

  Object.keys(to).forEach(key => {
    if (to[key]) fromProxy[key] = to[key]
  })

  // new object with changes (and only changes), 
  // excluding props that changed to undefined or null
  return {
    toObject: () =>
      captureArray
        .map(i => ({ [i.prop]: fromProxy[i.prop] }))
        .reduce((a, b) => ({ ...a, ...b }), {}),
    toArray: () => captureArray,
    toArrayOfKeys: () => captureArray.map(i => i.prop)
  }
}

/**
 *
 * @param {*} param0
 * @returns
 */
function filterByChangeType ({ from, to, changeType, changeTypeValue }) {
  const keys = findChanges(from, to).toArrayOfKeys()
  const changeTypes = {
    toValue: (from, to, val) => to === val,
    fromValue: (from, to, val) => from === val,
    typeDiff: (from, to, val) => typeof to !== typeof from,
    toTypeValue: (from, to, val) => typeof to === val,
    fromTypeValue: (from, to, val) => typeof from === val,
    definedOnly: (from, to, val) => typeof to !== 'undefined',
    greaterThan: (from, to, val) => from > to,
    lessThan: (from, to, val) => from < to
  }

  if (changeType)
    return keys.filter(key =>
      changeTypes[changeType](from[key], to[key], changeTypeValue)
    )
  return keys
}

module.exports = { changeDataCapture, findChanges, filterByChangeType }

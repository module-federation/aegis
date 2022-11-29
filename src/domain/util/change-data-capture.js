'use strict'

const { requestContext } = require('./async-context')

class CdcCapture extends Map {
  get (target) {
    const targetName =
      target.constructor?.name ||
      target.prototype?.constructor.name ||
      target.modelName ||
      target.getName()

    if (!targetName) return

    if (!super.has(targetName)) super.set(targetName, [])
    return super.get(targetName)
  }
}

const cdcCapture = new CdcCapture()

function capture (target, prop, value) {
  if (target[prop] === value) return false

  cdcCapture.get(target).push({
    object: target,
    prop,
    from: target[prop],
    to: value,
    time: Date.now(),
    user: requestContext.getStore().get('user')
  })

  console.log(`changed ${prop} from ${target[prop]} to ${value}`)
  return true
}

/**
 * @param {object} target
 * @param {Array<{prop:string,from:*,to:*}>} captureArray
 */
function changeDataCapture (target, handlers = []) {
  handlers.push(capture)

  const handler = {
    set (target, prop, value) {
      return handlers.reduce(h => h(target, prop, value))
    }
  }

  return new Proxy(target, handler)
}

/**
 *
 * @param {object} from
 * @param {object} to
 * @returns
 */
function findChanges (from, to) {
  const fromProxy = changeDataCapture(from)
  const captureArray = cdcCapture.get(from)

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

/**
 * Convert symbols in `obj` to functions
 *
 * @param {*} obj
 * @returns
 */
export function fromSymbols (obj) {
  return Object.getOwnPropertySymbols(obj)
    .map(s => ({
      [obj[s].name
        .split('[')
        .join('')
        .split(']')
        .join('')]: obj[s]
    }))
    .reduce((a, b) => ({ ...a, ...b }))
}

export function fromGlobalSymbols (obj) {
  return Object.getOwnPropertySymbols(obj)
    .map(s => ({ [Symbol.keyFor(s).split('.')[1]]: obj[s] }))
    .reduce((a, b) => ({ ...a, ...b }))
}

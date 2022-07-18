const compose = require('../../src/domain/util/compose')

function increment (num) {
  const sum = num + 1
  console.log(`increment: ${sum}`)
  return sum
}

function decrement (num) {
  const diff = num - 1
  console.log(`decrement: ${diff}`)
  return diff
}

console.log(compose(increment, decrement)(1))

const incrementDecrement = compose(increment, increment, decrement)

console.log(incrementDecrement(1))

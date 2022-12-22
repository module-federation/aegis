/**
 * `y` is within `n` of `m`.
 * m - n > y && m + n < y
 * @param {number} y
 * @param {number} n
 * @param {number} m
 * @returns
 */
function within(y, n, m) {
  return (
    Array.from({ length: n }, (x, i) => i)
      .map(i => i + y)
      .includes(m) ||
    Array.from({ length: n }, (x, i) => i)
      .map(i => y - i)
      .includes(m)
  )
}

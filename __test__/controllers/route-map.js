const { assert } = require('console')
const { pathToRegexp } = require('path-to-regexp')

class RouteMap extends Map {
  find(path) {
    return [...super.keys()].find(
      regex => regex instanceof RegExp && regex.test(path)
    )
  }

  set(path, method) {
    super.set(pathToRegexp(path), method)
  }

  has(path) {
    return this.find(path) ? true : false
  }

  get(path) {
    return this.find(path)
  }
}

const routes = new RouteMap()
routes.set('/order/:123')
assert(routes.has('/order/123'))

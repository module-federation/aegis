const idRoute = route =>
  route
    .split('/')
    .splice(5, 1)
    .concat([':id'])
    .join('/')

const idParam = route =>
  route
    .split('/')
    .splice(5, 2)
    .map(p => ({ ['id']: p }))

const cmdRoute = route =>
  route
    .split('/')
    .splice(0, 5)
    .concat([':id', ':command'])
    .join('/')

const cmdParams = route =>
  route
    .split('/')
    .splice(5, 2)
    .map((p, i) => ({ [['id', 'command'][i]]: p }))

/**
 * Store routes and their controllers
 * @extends {Map}
 */
export default class RouteMap extends Map {
  // match (route) {
  //   const routeParts = route.split('/')
  //   super.keys.forEach(function (template) {
  //     const templateParts = template.split('/')

  //     if (routeParts.length !== templateParts.length) return false

  //     if (routeParts.every((r, i) => r === templateParts[i])) {
  //       this.route = template
  //       return true
  //     }
  //   })
  // }

  has (route) {
    if (!route) {
      console.warn('route is ', typeof route)
      return false
    }

    if (super.has(route)) {
      this.route = super.get(route)
      return true
    }

    // /microlib/api/models/orders/:id
    const idInstance = idRoute(route)
    if (route.match(/\//g).length === 5 && super.has(idInstance)) {
      this.route = super.get(idInstance)
      this.params = idParam(route)
      return true
    }

    // /microlib/api/models/orders/:id/:command
    const cmdInstance = cmdRoute(route)
    if (route.match(/\//g).length === 6 && super.has(cmdInstance)) {
      this.route = super.get(cmdInstance)
      this.params = cmdParams(route)
      return true
    }
    return false
  }

  get (route) {
    return this.route ? this.route : super.get(route)
  }

  getPathParams () {
    return this.params ? this.params : {}
  }
}

'use strict'
const path = require('path')
const jwt = require('express-jwt')
const jwks = require('jwks-rsa')
console.log('zackwashere', path.resolve(process.cwd(), './auth/key-set.json'))
const keySet = require(path.resolve(process.cwd(), './auth/key-set.json'))
const authEnabled = /true/i.test(process.env.AUTH_ENABLED)

exports.protectRoutes = function (app, path) {
  if (!authEnabled) return app

  const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
      cache: keySet.cache,
      rateLimit: keySet.rateLimit,
      jwksRequestsPerMinute: keySet.jwksRequestsPerMinute,
      jwksUri: keySet.jwksUri
    }),
    audience: keySet.audience,
    issuer: keySet.issuer,
    algorithms: keySet.algorithms
  })

  app.use(path, jwtCheck)

  return app
}

'use strict'

const path = require('path')

/**
 * @type {import('../public/aegis.config.test.json')}
 */
exports.aegisConfg = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))

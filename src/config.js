'use strict'

const path = require('path')

/**
 * @type {import('../public/aegis.config.test.json')}
 */
exports.aegisConfig = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))

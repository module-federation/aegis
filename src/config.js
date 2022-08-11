'use strict'

const path = require('path')

/**
 * @type {import('../public/aegis.config.json')}
 */
exports.hostConfig = require(path.resolve(
  process.cwd(),
  'public',
  'aegis.config.json'
))

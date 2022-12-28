'use strict'
exports.__esModule = true
var assert = require('assert')

import ModelFactory from '../../esm/domain/model-factory'

describe('datasource inheritance', function () {
  describe('polymorph', function () {
    it('dataSource.saveSync()', async function () {
      /**@type {import("../../src/domain/datasource").default} */
      const dsMemory =
        require('../../src/domain/datasource-factory').getDataSource('test', {
          adapter: 'DataSourceMemory',
        })
      /**@type {import("../../src/domain/datasource").default} */
      const dsMongo =
        require('../../src/domain/datasource-factory').getDataSource('test', {
          adapter: 'DataSourceMongoDb',
        })
      dsMemory.saveSync(1, { a: 1 })
      dsMongo.saveSync(1, { b: 2 })
      console.log(dsMemory.findSync(1))
      assert.strictEqual(updated.a, 'b')
    })
  })
})

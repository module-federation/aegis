'use strict'

var assert = require('assert')

import ModelFactory from '../../src/domain'
import { BrokerSingleton } from '../../src/domain/broker'
import DataSourceFactory from '../../src/domain/datasource-factory'
const fn = x => console.log(x)
const modelName = 'abc'

describe('ModelFactory', function () {
  describe('#createModel()', function () {
    it('should register & create model', async function () {
      ModelFactory.registerModel({
        modelName,
        factory: () => ({ a: fn, b: 'c' }),
        endpoint: 'abcs',
        dependencies: { uuid: () => Math.random(), fn },
      })

      const spec = ModelFactory.getModelSpec(modelName)
      assert.equal(spec.modelName, modelName)

      const model = await ModelFactory.createModel({
        broker: BrokerSingleton.getInstance(),
        datasource: DataSourceFactory.getDataSource(modelName),
        modelName,
        b: 'cccc',
      })
      console.log(model.a('model'))
    })
  })
})

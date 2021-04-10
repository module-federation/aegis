'use strict'

var assert = require('assert');

import addModelFactory from '../../lib/use-cases/add-model'
import DataSourceFactory from '../../lib/datasources'
import ModelFactory from '../../lib/lib/models';
import ObserverFactory from '../../lib/models/observer';

describe('Use-Cases', function () {
  describe('addModel()', function () {
    it('should add new model', async function () {
      ModelFactory.registerModel({
        modelName: 'ABC',
        factory: ({ a }) => ({ a, b: 'c' }),
        endpoint: 'abcs',
        dependencies: {}
      });
      ModelFactory.registerEvent(
        ModelFactory.EventTypes.CREATE,
        'ABC',
        (model) => ({model})
      );
      const model = await addModelFactory({
        modelName: 'ABC',
        models: ModelFactory,
        repository: DataSourceFactory.getDataSource('ABC'),
        observer: ObserverFactory.getInstance()
      })({ a: 'a' });
      assert.strictEqual(model.a, { a: 'a' }.a);
    });
  });
});
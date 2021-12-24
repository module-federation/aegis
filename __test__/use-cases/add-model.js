// 'use strict'

// var assert = require('assert');

// import addModelFactory from '../../src/use-cases/add-model'
// import DataSourceFactory from '../../src/datasources'
// import ModelFactory from '../../src/domain';
// import BrokerSingleton from '../../src/lib/broker';

// describe('Use-Cases', function () {
//   describe('addModel()', function () {
//     it('should add new model', async function () {
//       ModelFactory.registerModel({
//         modelName: 'ABC',
//         factory: ({ a }) => ({ a, b: 'c' }),
//         endpoint: 'abcs',
//         dependencies: {}
//       });
//       ModelFactory.registerEvent(
//         ModelFactory.EventTypes.CREATE,
//         'ABC',
//         (model) => ({model})
//       );
//       const model = await addModelFactory({
//         modelName: 'ABC',
//         models: ModelFactory,
//         repository: DataSourceFactory.getDataSource('ABC'),
//         broker: BrokerSingleton.getInstance()
//       })({ a: 'a' });
//       assert.strictEqual(model.a, { a: 'a' }.a);
//     });
//   });
// });

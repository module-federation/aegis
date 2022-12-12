const {
  default: makeDeployModel
} = require('../../src/domain/use-cases/deploy-model')

describe('Use-Cases', function () {
  describe('deployModel()', function () {
    it('should add new remoteEntry and recompile', async function () {
      makeDeployModel({
        name: 'test',
        url: 'http://localhost:8000/remmoteEntry.js',
        path: __dirname,
        type: 'model'
      })
    })
  })
})

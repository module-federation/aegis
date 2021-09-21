/**
 * Machine Learning Operations Workflow
 * - deployment
 * - training
 * - activation
 * - archival
 * - destruction
 * @type {import("../src/domain").ModelSpecification}
 */
const MLOps = {
  modelName: 'mlops',
  endpoint: 'mlops',
  ports: {
    defineModel: {
      service: 'mlopsModelMgmt',
      type: 'outbound',
      keys: ['', ''],
      consumesEvent: 'mlopsDefineMmodel',
      producesEvent: 'mlopsModelVerified'
    },
    findModel: {
      keys: ['trainingDataLocation']
    },
    fetchTrainingData: {
      service: 'repoClient',
      type: 'inbound',
      consumesEvent: 'mlopsRetrieveTrainingData',
      producesEvent: 'mlopsTrainingDataRetrieved'
    },
    deployModel: {
      service: 'mlopsModelMgmt',
      type: 'outbound',
      consumesEvent: 'mlopsDeployModel',
      producesEvent: 'mlopsModelDeployed'
    },
    trainModel: {},
    detectConvergence: {
      timeout: 600000
    },
    compareResults: {},
    reportResults:{},
    implementRecommendations:{},
  }
}

module.exports.MLOps = MLOps

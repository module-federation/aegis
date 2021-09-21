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
      service: 'MLOpsManager',
      type: 'outbound',
      keys: ['', ''],
      consumesEvent: 'mlopsDefineModel',
      producesEvent: 'mlopsModelVerified'
    },
    findModel: {
      service: 'MLOpsManager',
      keys: ['trainingDataLocation']
    },
    fetchTrainingData: {
      service: 'MLOpsManager',
      service: 'repoClient',
      type: 'inbound',
      consumesEvent: 'mlopsRetrieveTrainingData',
      producesEvent: 'mlopsTrainingDataRetrieved'
    },
    deployModel: {
      service: 'MLOpsManager',
      type: 'outbound',
      consumesEvent: 'mlopsDeployModel',
      producesEvent: 'mlopsModelDeployed'
    },
    trainModel: {},
    detectConvergence: {
      timeout: 600000
    },
    compareResults: {},
    reportResults: {},
    implementRecommendations: {}
  }
}

module.exports.MLOps = MLOps

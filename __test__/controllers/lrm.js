const ModelFactory = {
  getModelSpecs (model) {
    model = [
      {
        relations: {
          rel1: { modelName: 'm1', type: 'inbound', foreignKey: 'customerId' }
        }
      }
    ]
    return model
  },
  getModelSpec (model) {
    model = {
      relations: {
        rel1: { modelName: 'm1', type: 'inbound', foreignKey: 'customerId' }
      }
    }
    return model
  }
}

function findLocalRelatedModels (modelName) {
  const relations = ModelFactory.getModelSpec(modelName).relations
  const localModels = ModelFactory.getModelSpecs().map(spec => spec.modelName)
  const localRelatedModels = Object.keys(relations)
    .map(k => relations[k].modelName)
    .filter(modelName => localModels.includes(modelName))
  return localRelatedModels
}

console.log(findLocalRelatedModels('ORDER'))

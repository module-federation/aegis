'use strict'

import { UseCases, getUserRoutes } from '../../domain/use-cases'

const {
  addModels,
  editModels,
  findModels,
  listConfigs,
  loadModels,
  listModels,
  removeModels,
  hotReload,
  registerEvents
} = UseCases

import postModelFactory from './post-model'
import patchModelFactory from './patch-model'
import getModelsFactory from './get-models'
import getModelByIdFactory from './get-model-by-id'
import deleteModelFactory from './delete-model'
import getConfigFactory from './get-config'
import makeLiveUpdate from './live-update'

function make (useCases, controllerFactory) {
  return useCases().map(uc => ({
    endpoint: uc.endpoint,
    fn: controllerFactory(uc.fn)
  }))
}

export const postModels = () => make(addModels, postModelFactory)
export const patchModels = () => make(editModels, patchModelFactory)
export const getModels = () => make(listModels, getModelsFactory)
export const getModelsById = () => make(findModels, getModelByIdFactory)
export const deleteModels = () => make(removeModels, deleteModelFactory)
export const liveUpdate = () => make(hotReload, makeLiveUpdate)
export const getConfig = () => getConfigFactory(listConfigs())
export const getRoutes = () => getUserRoutes()

export const initCache = () => {
  const label = '\ntime to load cache'
  const specs = loadModels()
  registerEvents()

  async function loadModelInstances () {
    console.time(label)
    await Promise.allSettled(specs.map(async m => m.fn()))
    console.timeEnd(label)
  }

  return {
    load: () => loadModelInstances()
  }
}

export { default as http } from './http-adapter'

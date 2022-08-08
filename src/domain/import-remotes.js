'use strict'

/**
 * @param {Promise<import('.').ModelSpecification[]>} remoteEntries
 * @param {"model"|"adapter"|"service"} type
 * @returns {Promise<import('.').ModelSpecification[]>}
 */
async function importFederatedModules (remoteEntries, type) {
  const startTime = Date.now()
  const modules = await Promise.all(
    Object.values(remoteEntries)
      .map(v => Object.values(v))
      .flat(3)
      .filter(entry => entry.type === type)
      .map(entry => entry.importRemote())
  )
  // console.debug('modules', modules)
  console.info(`${type} import took %d ms`, Date.now() - startTime)
  return modules
}

function parse (modules) {
  return {
    toObject: () => modules.reduce((a, b) => ({ ...a, ...b }), {}),
    toArray: key => modules.map(m => (m[key] ? m[key] : m)).flat()
  }
}

export async function importRemoteModels (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'model')
  return parse(modules).toArray('models')
}

export async function importRemoteServices (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'service')
  return parse(modules).toObject()
}

export async function importRemoteAdapters (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'adapter')
  return parse(modules).toObject()
}

export async function importRemotePorts (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'port')
  return parse(modules).toObject()
}

export async function importRemoteWorkers (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'worker')
  return parse(modules).toObject()
}

export async function importModelCache (remoteEntries) {
  const result = await importFederatedModules(remoteEntries, 'model-cache')
  return parse(result).toArray('models')
}

export async function importServiceCache (remoteEntries) {
  const result = await importFederatedModules(remoteEntries, 'service-cache')
  return parse(result).toObject()
}

export async function importAdapterCache (remoteEntries) {
  const result = await importFederatedModules(remoteEntries, 'adapter-cache')
  return parse(result).toObject()
}

export async function importWorkerCache (remoteEntries) {
  const result = await importFederatedModules(remoteEntries, 'worker-cache')
  return parse(result).toArray()
}

export async function importPortCache (remoteEntries) {
  const modules = await importFederatedModules(remoteEntries, 'port-cache')
  return parse(modules).toObject()
}

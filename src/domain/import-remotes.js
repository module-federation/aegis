"use strict";

/**`
 * @param {Promise<import('.').ModelSpecification[]>} remoteEntries
 * @param {"model"|"adapter"|"service"} type
 * @returns {Promise<import('.').ModelSpecification[]>}
 */
async function importFederatedModules(remoteEntries, type) {
  const startTime = Date.now();
  const modules = await Promise.all(
    remoteEntries
      .filter(entry => entry.type === type)
      .map(entry => entry.importRemote())
  );
  console.info(modules.flat());
  console.info(`${type} import took %d ms`, Date.now() - startTime);
  return modules.flat();
}

export async function importRemoteModels(remoteEntries) {
  return importFederatedModules(remoteEntries, "model");
}

export async function importRemoteServices(remoteEntries) {
  const services = await importFederatedModules(remoteEntries, "service");
}

export async function importRemoteAdapters(remoteEntries) {
  const adapters = await importFederatedModules(remoteEntries, "adapter");
}

export async function importModelCache(remoteEntries, name) {
  return importFederatedModules(remoteEntries, "model-cache");
}

export async function importServiceCache(remoteEntries) {
  const services = importFederatedModules(remoteEntries, "service-cache");
}

export async function importAdapterCache(remoteEntries) {
  const adapters = importFederatedModules(remoteEntries, "adapter-cache");
}

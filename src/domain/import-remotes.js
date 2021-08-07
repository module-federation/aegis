"use strict";

async function importFederatedModules(remoteEntries, type) {
  const startTime = Date.now();
  const modules = await Promise.all(
    remoteEntries
      .filter(entry => entry.type === type)
      .map(entry => entry.importRemote())
  );
  console.info(`${type} import took %d ms`, Date.now() - startTime);
  return modules;
}

/**
 * @returns {Promise<import('.').ModelSpecification[]>}
 */
export async function importRemoteModels(remoteEntries) {
  const remoteModels = await importFederatedModules(remoteEntries, "model");
  if (remoteModels.length === 0) return;
  return remoteModels.reduce((p, c) => ({ ...p, ...c }));
}

/**
 * Imports remote service modules.
 */
export async function importRemoteServices(remoteEntries) {
  const services = await importFederatedModules(remoteEntries, "service");
  if (services.length === 0) return {};
  return services.reduce((p, c) => ({ ...p, ...c }));
}

export async function importRemoteAdapters(remoteEntries) {
  const adapters = await importFederatedModules(remoteEntries, "adapter");
  if (adapters.length === 0) return {};
  return adapters.reduce((p, c) => ({ ...p, ...c }));
}

export async function importModelCache(remoteEntries, name) {
  const remoteModels = importFederatedModules(remoteEntries, "model-cache");
  if (remoteModels.length === 0) return;
  return remoteModels.reduce((p, c) => ({ ...p, ...c }));
}

/**
 * Imports remote service modules.
 */
export async function importServiceCache(remoteEntries) {
  const services = importFederatedModules(remoteEntries, "service-cache");
  if (services.length === 0) return;
  return services.reduce((p, c) => ({ ...p, ...c }));
}

export async function importAdapterCache(remoteEntries) {
  const startTime = Date.now();
  const adapters = importFederatedModules(remoteEntries, "adapter-cache");
  if (adapters.length === 0) return;
  return adapters.reduce((p, c) => ({ ...p, ...c }));
}

export async function importWebAssembly(remoteEntries) {
  __webpack_require__.p = "https://api.github.com/";
  // const wasm = await Promise.all(
  //   remoteEntries.filter(e => e.type === "wasm").map(e => e.importRemote())
  // );
  // console.log(wasm);
  //fetch(url, imports)
}

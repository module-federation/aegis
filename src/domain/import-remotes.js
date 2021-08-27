"use strict";

import { Module } from 'module';

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
  console.debug(modules)
  console.info(`${type} import took %d ms`, Date.now() - startTime);
  return modules.flat();
}

function parseModules(modules, key) {
  return modules.map(m => {
    if (m[key] && m[key] instanceof Array) return m[key];
    if (m instanceof Module) return Object.values(m);
    if (m instanceof Array) return m;
    return m;
  }).flat();
}

export async function importRemoteModels(remoteEntries) {
  const modelSpecs = await importFederatedModules(remoteEntries, "model");
  const parsed = parseModules(modelSpecs, "models");
  console.log(parsed);
  return parsed;
}

export async function importRemoteServices(remoteEntries) {
  return importFederatedModules(remoteEntries, "service");
}

export async function importRemoteAdapters(remoteEntries) {
  return importFederatedModules(remoteEntries, "adapter");
}

export async function importModelCache(remoteEntries) {
  const specs = await importFederatedModules(remoteEntries, "model-cache");
  const parsed = parseModules(modules);
  console.log(parsed);
  return parsed;
}

export async function importServiceCache(remoteEntries) {
  return importFederatedModules(remoteEntries, "service-cache");
}

export async function importAdapterCache(remoteEntries) {
  return importFederatedModules(remoteEntries, "adapter-cache");
}

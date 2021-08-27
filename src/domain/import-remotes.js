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

function parseModules(modules, key, type) {
  const result = modules.flat().map(m => {
    if (!m) return;
    if (key & m[key] && m[key] instanceof Array) return m[key];
    if (m instanceof Array) {
      if (m.length > 0) return m;
    } else {
      if (m instanceof Module) console.log(m, "is a Module");
      return m;
    }
  }).flat();

  return {
    toObject: () => result.reduce((p, c) => ({ ...p, ...c })),
    toArray: () => result
  }
}

export async function importRemoteModels(remoteEntries) {
  const modelSpecs = await importFederatedModules(remoteEntries, "model");
  const parsed = parseModules(modelSpecs, "models").toArray();
  console.log("parsed", parsed);
  return parsed;
}

export async function importRemoteServices(remoteEntries) {
  const services = await importFederatedModules(remoteEntries, "service")
  const parsed = parseModule(services).toObject();
  console.log(parsed)
  return parsed;
}

export async function importRemoteAdapters(remoteEntries) {
  const adapters = await importFederatedModules(remoteEntries, "adapter");
  const parsed = parseModules(adapters).toObject();
  return parsed;
}

export async function importModelCache(remoteEntries) {
  const specs = await importFederatedModules(remoteEntries, "model-cache");
  const parsed = parseModules(specs, "models").toArray();
  console.log(parsed);
  return parsed;
}

export async function importServiceCache(remoteEntries) {
  const sc = await importFederatedModules(remoteEntries, "service-cache");
  const parsed = parseModules(sc).toObject();
  console.log(parsed);
}

export async function importAdapterCache(remoteEntries) {
  const ac = await importFederatedModules(remoteEntries, "adapter-cache");
  return parseModules(ac).toObject();
}

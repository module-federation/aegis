"use strict";
import { fetchWasm } from "./util/fetch-wasm";

async function importFederatedModules(remoteEntries, type, wasm = false) {
  const startTime = Date.now();
  const modules = await Promise.all(
    remoteEntries
      .filter(entry => entry.type === type && !entry.wasm)
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
  const adapters = importFederatedModules(remoteEntries, "adapter-cache");
  if (adapters.length === 0) return;
  return adapters.reduce((p, c) => ({ ...p, ...c }));
}

export async function importWebAssembly(remoteEntries, importObject) {
  const startTime = Date.now();

  const wasmModules = await Promise.all(
    remoteEntries
      .filter(entry => entry.wasm)
      .map(async function (entry) {
        if (!importObject) {
          importObject = {
            env: {
              log: () => console.log("wasm module imported"),
            },
          };
        }
        // Check if we support streaming instantiation
        // if (WebAssembly.instantiateStreaming) {
        //   console.info("stream-compiling wasm module", entry.url);
        //   // Fetch the module, and instantiate it as it is downloading
        //   return WebAssembly.instantiateStreaming(
        //     fetchWasm(entry.url),
        //     importObject
        //   );
        // }
        // Fallback to using fetch to download the entire module
        // And then instantiate the module
        const response = await fetchWasm(entry);
        /**@todo remove this debug  */
        console.debug(
          (
            await WebAssembly.instantiate(response, importObject)
          ).instance.exports.modelFactory("input")
        );
        return response;
      })
  );

  console.info("wasm modules took %dms", Date.now() - startTime);
  wasmModules.forEach(m => m.log());
}

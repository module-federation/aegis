"use strict";
import { fetchWasm } from "./util/fetch-wasm";

async function importFederatedModules(remoteEntries, type, wasm = false) {
  const startTime = Date.now();
  const modules = await Promise.all(
    remoteEntries
      .filter(entry => entry.type === type && !wasm)
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
  let response = undefined;

  remoteEntries.forEach(async function (entry) {
    if (!entry.wasm) return;

    if (!importObject) {
      importObject = {
        env: {
          log: () => console.log("wasm module imported"),
        },
      };
    }

    // Check if the browser supports streaming instantiation
    if (WebAssembly.instantiateStreaming) {
      // Fetch the module, and instantiate it as it is downloading
      response = await WebAssembly.instantiateStreaming(
        fetchWasm(url),
        importObject
      );
    } else {
      // Fallback to using fetch to download the entire module
      // And then instantiate the module
      const fetchAndInstantiateTask = async () => {
        const wasmArrayBuffer = await fetchWasm(entry.url).then(response =>
          response.arrayBuffer()
        );
        return WebAssembly.instantiate(wasmArrayBuffer, importObject);
      };
      response = await fetchAndInstantiateTask();
    }

    return response;
  });
}

"use strict";
// import { fetchWasm } from "../adapters/wasm/fetch-wasm";
// const AsBind = require("as-bind/dist/as-bind.cjs.js");

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
  const adapters = importFederatedModules(remoteEntries, "adapter-cache");
  if (adapters.length === 0) return;
  return adapters.reduce((p, c) => ({ ...p, ...c }));
}

// export async function importWebAssembly(remoteEntries, importObject) {
//   const startTime = Date.now();

//   const wasmModules = await Promise.all(
//     remoteEntries
//       .filter(entry => entry.wasm)
//       .map(async function (entry) {
//         if (!importObject) {
//           importObject = {
//             env: {
//               log: () => console.log("wasm module imported"),
//             },
//           };
//         }

//         // Check if we support streaming instantiation
//         if (!WebAssembly.instantiateStreaming)
//           console.log("we can't stream-compile wasm");

//         const response = await fetchWasm(entry);

//         const wasm = await AsBind.instantiate(response.asBase64Buffer(), {
//           env: {
//             log: value => console.log("from wasm" + value),
//           },
//         });
//         console.log("modelName:", wasm.exports.getModelName());

//         return wasm;
//       })
//   );

//   console.info("wasm modules took %dms", Date.now() - startTime);

//   return wasmModules;
// }

"use strict";

import loader from "@assemblyscript/loader";
import { Observer } from "../../domain/observer";
const observer = Observer.getInstance();

import {
  wrapWasmAdapter,
  wrapWasmModelSpec,
  wrapWasmService,
} from "./wasm-interop";

const { Octokit } = require("@octokit/rest");
const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

function octoGet(entry) {
  console.info("github url", entry.url);
  const owner = entry.owner;
  const repo = entry.repo;
  const filedir = entry.filedir;
  const branch = entry.branch;
  return new Promise(function (resolve, reject) {
    octokit
      .request("GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}", {
        owner,
        repo,
        filedir,
        branch,
      })
      .then(function (rest) {
        const file = rest.data.find(datum => /\.wasm$/.test(datum.name));
        return file.sha;
      })
      .then(function (sha) {
        console.log(sha);
        return octokit.request("GET /repos/{owner}/{repo}/git/blobs/{sha}", {
          owner,
          repo,
          sha,
        });
      })
      .then(function (rest) {
        const buf = Buffer.from(rest.data.content, "base64");
        resolve({
          toString: () => buf.toString("utf-8"),
          asBase64Buffer: () => buf,
          toUint16Array: () =>
            new Uint16Array(
              buf.buffer,
              buf.byteOffset,
              buf.length / Uint16Array.BYTES_PER_ELEMENT
            ),
        });
      }).catch(err => reject(err));
  });
}

function httpGet(entry) {
  return new Promise((resolve, reject) => {
    const url = new URL(entry.url);
    require(url.protocol.replace(":", "")).get(
      entry.url,
      { rejectUnauthorized: false },
      function (response) {
        response.pipe(fs.createWriteStream(entry.path));
        response.on("end", resolve);
        response.on("error", (err) => reject(err));
      }
    );
  }
}

export function fetchWasm(entry) {
  if (/github/i.test(entry.url)) return octoGet(entry);
  return httpGet(entry.url);
}

export async function importWebAssembly(
  remoteEntry,
  importObject = { env: { abort: (err) => observer.notify("wasmAbort", err) } },
  type = "model"
) {
  const startTime = Date.now();

  // Check if we support streaming instantiation
  if (!WebAssembly.instantiateStreaming) console.log("we can't stream-compile wasm");

  const response = await fetchWasm(remoteEntry);
  const wasm = await loader.instantiate(response.asBase64Buffer(), importObject);
  console.info("wasm modules took %dms", Date.now() - startTime);

  if (type === "model") return wrapWasmModelSpec(wasm);
  if (type === "adapter") return wrapWasmAdapter(wasm);
  if (type === "service") return wrapWasmService(wasm);
}

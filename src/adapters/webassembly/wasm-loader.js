'use strict'

import { Octokit } from '@octokit/rest'
import loader from '@assemblyscript/loader'

const token = process.env.GITHUB_TOKEN
const octokit = new Octokit({ auth: token })
const headers = {
  name: 'Accept',
  value: 'application/wasm'
}

/**
 * Fetch WASM bytecode (.wasm file) from Github repo
 * @param {import('../../../webpack/remote-entries-type').remoteEntry} entry
 * @returns {Buffer|String|Uint16Array}
 */
function octoFetch (entry) {
  const owner = entry.owner
  const repo = entry.repo
  const filedir = entry.filedir
  const branch = entry.branch

  return new Promise(function (resolve, reject) {
    octokit
      .request('GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}', {
        owner,
        repo,
        filedir,
        branch
      })
      .then(function (rest) {
        const file = rest.data.find(datum => /\.wasm$/.test(datum.name))
        return file.sha
      })
      .then(async function (sha) {
        const response = fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
          {
            headers
          }
        )
        resolve(response)
      })
      .catch(err => reject(err))
  })
}

async function _fetch (entry) {
  return fetch(entry.url, { headers })
}

async function instantiate (entry, imports, stream) {
  console.log('compile from downloaded file')
  const response = await stream(entry)
  const bytes = await response?.arrayBuffer()
  return loader.instantiate(bytes, imports)
}

export async function loadWasmModule (entry, imports) {
  console.log(`fetching ${entry.url}`)

  const stream = /^https:\/\/api.github.com.*/i.test(entry.url)
    ? octoFetch
    : _fetch

  if (!loader.instantiateStreaming) return instantiate(entry, imports, stream)

  console.log('compiling from stream')
  return loader.instantiateStreaming(stream(entry), imports)
}

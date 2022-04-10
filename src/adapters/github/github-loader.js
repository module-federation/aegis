'use strict'

import { Octokit } from '@octokit/rest'
const token = process.env.GITHUB_TOKEN
const octokit = new Octokit({ auth: token })

/**
 * Fetch WASM bytecode (.wasm file) from Github repo
 * @param {import('../../../webpack/remote-entries-type').remoteEntry} entry
 * @returns {Promise<Buffer|String|Uint16Array>}
 */
function octoGet (entry) {
  console.info('github url', entry.url)
  const owner = entry.owner
  const repo = entry.repo
  const filedir = entry.filedir
  const branch = entry.branch
  const worker = entry.worker

  return new Promise(function (resolve, reject) {
    octokit
      .request('GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}', {
        owner,
        repo,
        filedir,
        branch
      })
      .then(function (rest) {
        const file = rest.data.find(datum => worker == datum.name)
        return file.sha
      })
      .then(function (sha) {
        return octokit.request('GET /repos/{owner}/{repo}/git/blobs/{sha}', {
          owner,
          repo,
          sha
        })
      })
      .then(function (rest) {
        const buf = Buffer.from(rest.data.content, 'base64')
        resolve({
          toString: () => buf.toString('utf-8'),
          asBase64Buffer: () => buf,
          toUint16Array: () =>
            new Uint16Array(
              buf.buffer,
              buf.byteOffset,
              buf.length / Uint16Array.BYTES_PER_ELEMENT
            )
        })
      })
      .catch(err => reject(err))
  })
}

export function resolve (specifier, context, defaultResolve) {
  const { parentURL = null } = context

  // Normally Node.js would error on specifiers starting with 'https://', so
  // this hook intercepts them and converts them into absolute URLs to be
  // passed along to the later hooks below.
  if (specifier.startsWith('git://')) {
    return {
      url: specifier
    }
  } else if (parentURL && parentURL.startsWith('git://')) {
    return {
      url: new URL(specifier, parentURL).href
    }
  }

  // Let Node.js handle all other specifiers.
  return defaultResolve(specifier, context, defaultResolve)
}

export function load (url, context, defaultLoad) {
  const remoteEntry = {
    url: 'https://api.github.com',
    owner: 'module-federation',
    repo: 'remote-worker',
    branch: 'main',
    filedir: 'src',
    worker: 'worker.js'
  }

  if (url.startsWith('git://')) {
    const _url = new URL(url)
    remoteEntry.owner = _url.searchParams.get('owner')
    remoteEntry.repo = _url.searchParams.get('repo')
    remoteEntry.branch = _url.searchParams.get('branch')
    remoteEntry.filedir = _url.searchParams.get('filedir')
    remoteEntry.branch = _url.searchParams.get('branch')
    remoteEntry.worker = _url.searchParams.get('worker')

    return new Promise(async (resolve, reject) => {
      const response = await octoGet(remoteEntry)
      return resolve({
        format: 'module',
        source: response.toString()
      })
    })
  }

  // Let Node.js handle all other URLs.
  return defaultLoad(url, context, defaultLoad)
}

'use strict'

import { Octokit } from '@octokit/rest'
const token = process.env.GITHUB_TOKEN
const octokit = new Octokit({ auth: token })

/**
 * Fetches WASM bytecode from a Github repo or any HTTP endpoint
 */
export const RepoClient = {
  /**
   * Fetch WASM bytecode (.wasm file) from Github repo
   * @param {import('../../../webpack/remote-entries-type').remoteEntry} entry
   * @returns {Buffer|String|Uint16Array}
   */
  octoGet (entry) {
    console.info('github url', entry.url)
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
  },

  /**
   * Fetch data from http endpoint
   * @param {*} params
   * @returns
   */
  httpGet (params) {
    return new Promise(function (resolve, reject) {
      var req = require(params.protocol.slice(
        0,
        params.protocol.length - 1
      )).request(params, function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('statusCode=' + res.statusCode))
        }
        var body = []
        res.on('data', function (chunk) {
          body.push(chunk)
        })
        res.on('end', function () {
          try {
            body = Buffer.concat(body).toString()
          } catch (e) {
            reject(e)
          }
          resolve(body)
        })
      })
      req.on('error', function (err) {
        reject(err)
      })
      req.end()
    })
  },

  /**
   * Fetch wasm bytecode (.wasm file) from a Github repo or a web server
   * @param {import('../../../webpack/remote-entries-type').remoteEntry} entry
   * @returns
   */
  async fetch (entry) {
    if (/^https:\/\/api.github.com.*/i.test(entry.url))
      return this.octoGet(entry)
    return this.httpGet(entry.url)
  }
}

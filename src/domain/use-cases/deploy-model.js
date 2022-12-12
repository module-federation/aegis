'use strict'

import path from 'path'
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { AppError } from '../util/app-error'
import model from '../../../lib/domain/model'

async function compileAndReload () {
  exec('cd ../aegis-host yarn build && yarn reload', (stderr, stdout, stdin) =>
    console.log(stderr || stdout || stdin)
  )
}

function createFileContents (remoteEntry) {
  const CURLYBRACKET = '}'
  const COMMA = ','
  const reString = JSON.stringify(remoteEntry, null, 2)
  const WASMIMPORT = `const { importWebAssembly } = require('@module-federation/aegis').adapters.webassembly\n\n`
  const WASMENTRY = `exports.${remoteEntry.name} = [\n ${reString}\n  importRemote () {\n   return importWebAssembly(this)\n  }\n }\n]`
  const JSENTRY = `exports.${remoteEntry.name} = [\n ${reString}\n  importRemote: () =>  import("${remoteEntry.name}/models")\n }\n]`

  return remoteEntry.wasm
    ? WASMIMPORT + WASMENTRY.replace(CURLYBRACKET, COMMA)
    : JSENTRY.replace(CURLYBRACKET, COMMA)
}

async function resolveWebpackPath (remoteEntry) {
  const p = path.resolve(process.cwd(), 'webpack/remote-entries')
  try {
    await fs.stat(p)
    return p
  } catch (error) {
    return remoteEntry.path
  }
}

/**
 * Process new remote entry.
 * @param {import('../../../webpack/remote-entries-type.js').remoteEntry} remoteEntry
 */
async function registerRemote (remoteEntry) {
  console.debug({ remoteEntry })

  if (!remoteEntry?.name) throw new Error('no remote entry provided')

  const newFile = remoteEntry.name.concat('.js')
  const webpackDir = await resolveWebpackPath(remoteEntry)
  const fileContents = createFileContents(remoteEntry)
  console.debug({ webpackDir, newFile, fileContents })

  await fs.writeFile(path.resolve(webpackDir, newFile), fileContents)

  const indexFile = path.resolve(webpackDir, 'index.js')
  console.debug(indexFile)

  const remoteExports = await fs.readFile(indexFile)

  await fs.writeFile(
    indexFile,
    remoteExports
      .toString()
      .concat(`exports.${remoteEntry.name} = require('./${newFile}')\n`)
  )
  return fileContents
}

/**
 *
 * @param {{models:import('../model-factory.js').ModelFactory}} param0
 * @returns
 */
export default function makeDeployModel () {
  /**
   * Handle deployment request.
   *
   * Can come from:
   *  - source repo during rollout of new model
   *  - remote aegis instance during scale out or adaptive deployment
   *
   * @param {*} modelName
   */
  return async function deployModel (input) {
    try {
      const remotEntry = await registerRemote(input)
      await compileAndReload()
      return { status: 'ok', msg: 'created new remote entry', remotEntry }
    } catch (error) {
      console.error({ fn: deployModel.name, error })
      return AppError(error)
    }
  }
}

// registerRemote({
//   name: 'test',
//   url: 'http',
//   wasm: false,
//   path: '/Users/tysonmidboe/'
// }).then(i => console.log(i))

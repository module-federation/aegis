import { importRemoteCache } from '../index.js'
import path from 'path'
import { cmd } from '../util/cmd.js'

//
async function compileAndReload () {
  cmd('yarn build && yarn reload')
}

/**
 * Process new remote entry.
 * @param {import('../../../webpack/remote-entries-type.js').remoteEntry} remoteEntry
 */
async function registerRemote (remoteEntry) {
  if (!remoteEntry?.name) throw new Error('no remote entry provided')

  const newFile = remoteEntry.name.concat('.js')

  if (fs.existsSync(newFile))
    console.log('overritting remote entry file' + newFile)

  try {
    const fileContents =
      `const {importWebAssembly} = require('@module-federation/aegis').adapters.webassembly\n` +
      `const ${remoteEntry.name} = [${JSON.stringify(remoteEntry, 2, null) +
        `\nimportRemote() { return importWebAssembly(this) }`}]`

    fs.writeFileSync(
      path.resolve(process.cwd(), 'webpack/remote-entries', newFile),
      fileContents
    )

    const indexFile = path.resolve(
      process.cwd(),
      'webpack/remote-entries',
      'index.js'
    )

    const remoteExports = fs.readFileSync(indexFile)

    fs.writeFileSync(
      indexFile,
      remoteExports.concat(`\nexport  from './${newFile}'`)
    )

    await compileAndReload()
  } catch (error) {
    console.error({ fn: registerRemote.name, error })
  }
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
    console.log(input)
    await registerRemote(input)

    // if (models.getModelSpec(modelNameUpper)) return

    // importRemoteCache(modelNameUpper)

    // if (!models.getModelSpec(modelNameUpper))
    // throw new Error('model could not be loaded')
  }
}


const config = require('./webpack.config.js')
const webpack = require('webpack')

const compiler = webpack(config)

// `compiler.run()` doesn't support promises yet, only callbacks
async function compile () {
  // `compiler.run()` doesn't support promises yet, only callbacks
  await new Promise((resolve, reject) => {
    compiler.run((err, res) => {
      if (err) {
        return reject(err)
      }
      resolve(res)
    })
  })
}
await new Promise((resolve, reject) => {
  compiler.run((err, res) => {
    if (err) {
      return reject(err)
    }
    resolve(res)
  })
})

export function registerNewRemote (remoteEntry) {
  fs.writeFileSync(
    path.resolve(
      process.cwd(),
      'webpack/remote-entries',
      remoteEntry.modelFile
    ),
    JSON.stringify(remoteEntry.modelEntries)
  )
  fs.writeFileSync(
    path.resolve(process.cwd(), 'webpack', 'remote-entries.js'),
    JSON.stringify(remoteEntry.mainEntries)
  )

  compile()
}

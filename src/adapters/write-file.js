import fs from 'fs'

export function writeFile (_service) {
  return async function (options) {
    const {
      model,
      args: [callback]
    } = options

    try {
      model.files.forEach(file => fs.writeFileSynch(file.path, file.data))
    } catch (e) {
      console.error(provisonCert.name, e)
    }
  }
}

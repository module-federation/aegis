import fs, { fstat } from 'fs'

export function provisonCert (_service) {
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

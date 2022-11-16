import fs from 'fs'
import path from 'path'
import DataSource from '../../domain/datasource'

/**
 * Persistent storage on filesystem
 */
export class DataSourceFile extends DataSource {
  /**
   * @param {Set} map
   */
  constructor (map, name, options = {}) {
    super(map, name, options)
    this.file = this.getFilePath()
    this.className = DataSourceFile.name
  }

  getFilePath () {
    return path.resolve(process.cwd(), 'public', `${this.name}.json`)
  }
  /**
   *
   * @param {{
   *  hydrate:function(Map<string,import("../../domain/model").Model>),
   *  serializer:import("../../domain/serializer").Serializer,
   * }} param0
   */
  async load ({ hydrate, serializer }) {
    console.log('path to filesystem storage:', this.file)
    this.serializer = serializer
    this.readFile(hydrate)
  }

  replace (key, value) {
    if (value && this.serializer) {
      return this.serializer.serialize(key, value)
    }
    return value
  }

  revive (key, value) {
    if (value && this.serializer) {
      return this.serializer.deserialize(key, value)
    }
    return value
  }

  writeFile () {
    try {
      const dataStr = JSON.stringify(
        this.dsMap.map(v => v),
        this.replace
      )

      fs.writeFileSync(this.file, dataStr)
    } catch (error) {
      console.error({ fn: this.writeFile.name, path: this.file, error })
    }
  }

  /**
   *
   */
  readFile (hydrate) {
    if (fs.existsSync(this.file)) {
      const models = fs.readFileSync(this.file, 'utf-8')
      if (models) {
        JSON.parse(models, this.revive).forEach(([k, v]) =>
          this.dsMap.set(k, v)
        )
      }
    }
    return this.dsMap
  }

  findSync (id) {
    return super.findSync(id)
  }

  /**
   * @override
   * @param {*} id
   */
  async delete (id) {
    await super.delete(id)
    this.writeFile()
  }

  /**
   * @overrides
   * @param {*} id
   * @param {*} data
   */
  async save (id, data) {
    const ds = await super.save(id, data)
    this.writeFile()
    return ds
  }

  close () {
    this.writeFile()
  }
}

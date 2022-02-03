import fs from 'fs'
import path from 'path'
import { DataSourceMemory } from './datasource-memory'

const dirPath = process.env.DATASOURCE_DIRECTORY

/**
 * Persistent storage on filesystem
 */
export class DataSourceFile extends DataSourceMemory {
  /**
   * @param {Set} dataSource
   */
  constructor (dataSource, factory, name) {
    super(dataSource, factory, name)
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
    this.file = this.getFilePath()
    console.log('path to filesystem storage:', this.file)
    this.serializer = serializer
    this.dataSource = this.readFile(hydrate)
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
      const dataStr = JSON.stringify([...this.dataSource], this.replace)
      fs.writeFileSync(this.file, dataStr)
    } catch (error) {
      console.error({ fn: this.writeFile.name, file: this.file, error })
    }
  }

  /**
   *
   */
  readFile (hydrate) {
    if (fs.existsSync(this.file)) {
      const models = fs.readFileSync(this.file, 'utf-8')
      if (models) {
        return hydrate(new Map(JSON.parse(models, this.revive)))
      }
    }
    return new Map()
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

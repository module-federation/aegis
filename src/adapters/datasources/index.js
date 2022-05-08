export * from './datasource-memory'
export * from './datasource-file'
export * from './datasource-mongodb'
// export * from './datasource-ipfs'
// export * from './datasource-solid-pod'

import { DataSourceFile } from './datasource-file'
import { DataSourceMemory } from './datasource-memory'
import { DataSourceMongoDb } from './datasource-mongodb'

export const dsClasses = {
  [DataSourceFile.name]: DataSourceFile,
  [DataSourceMemory.name]: DataSourceMemory,
  [DataSourceMongoDb.name]: DataSourceMongoDb
}

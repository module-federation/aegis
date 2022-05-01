'use strict'

import DataSource from '../domain/datasource-factory'

/**
 * Bind adapter to service.
 */
export const Persistence = {
  async save (model) {
    return DataSource.getSharedDataSource(model.getName()).save(
      model.getId(),
      model
    )
  },

  async find (model) {
    return DataSource.getSharedDataSource(model.getName()).find(model.getId())
  },

  close () {}
}

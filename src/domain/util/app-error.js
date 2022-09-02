'use strict'

class AppError extends Error {
  constructor (error) {
    this.message = error?.message || error
    this.stack = error?.stack
    this.name = error?.name
  }
}

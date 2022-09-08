'use strict'

export class AppError extends Error {
  constructor (error) {
    super(error.message)
    this.stack = error.stack
    this.name = error.name
    this.cause = error.cause
    this.hasError = true
    this.time = Date.now()
  }

  toJSON () {
    return { ...this, time: new Date(this.time).toUTCString() }
  }
}

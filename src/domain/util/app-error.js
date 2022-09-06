'use strict'

class AppError extends Error {
  constructor (error) {
    super(error.message)
    this.name = error.name
    this.stack = error.stack
    this.cause = error.cause || 'unknown'
    this.time = date.now()
  }

  toJSON () {
    return { ...this, time: new Date(this.time).toUTCString() }
  }
}

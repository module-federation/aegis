'use strict'

class AppError {
  constructor (error) {
    this.message = error?.message
    this.stack = error?.stack
    this.name = error?.name
    this.hasError = true
  }
}

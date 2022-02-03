'use strict'

export default function AppError (error) {
  let name, message, stack
  if (error instanceof Error) {
    name = error.name
    message = error.message
    stack = error.stack
  } else if (typeof error === 'string') {
    message = error
  } else {
    message = 'unknown error type'
  }
  return {
    hasError: true,
    name,
    message,
    stack
  }
}

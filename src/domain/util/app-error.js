export function AppError (error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    hasError: true
  }
}

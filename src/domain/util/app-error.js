/**
 *
 * @param {Error} error
 * @returns
 */
export function AppError (error, code = null) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    code: code, // set http status code
    hasError: true
  }
}

/**
 * Wrap {@link Error}'s for quick identification as
 * errors after deserialization crossing thread boundary
 * @param {Error} error
 * @returns
 */
export function AppError (error, code = 400, cause = null) {
  if(code > 500) {
    code = 400
  }

  return {
    name: error.name,
    stack: error.stack,
    code: error.code || code, // set http status code
    cause: error.cause || cause,
    message: error.message,
    hasError: true
  }
}

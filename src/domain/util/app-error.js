/**
 * Do not through unhandled exceptions in workers and kill the thread.
 * Instead wrap {@link Error} and return it in the response to main.
 *
 * @param {Error} error
 * @returns
 */
export function AppError(error, code = 400, cause = null) {
  if (error.code > 500) {
    error.code = 400
  }

  return {
    name: error.name,
    stack: error.stack,
    code: error.code || code, // set http status code
    cause: error.cause || cause,
    message: error.message,
    hasError: true,
  }
}

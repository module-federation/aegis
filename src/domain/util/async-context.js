import { AsyncLocalStorage } from 'async_hooks'

/** @type {AsyncLocalStorage<Map<string, object>>} */
export const requestContext = new AsyncLocalStorage()

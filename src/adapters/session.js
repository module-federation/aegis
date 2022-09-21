'use strict'

import { AsyncLocalStorage } from "async_hooks"



export function session(req, res, next) {
    next()
}
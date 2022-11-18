'use strict'

let parsers

/**
 * Decorates `require('@module-federation/aegis').aegis`. Transforms tne input and output for
 * the `aegis.handle` function. The AWS parser works with API GW running on a Nodejs
 * lambda. Create additional parsers to extend support to other clouds. For better
 * performance, use the WasmEdge runtime instead (under development).
 *
 * @param {function():Promise<object>} getParsers - collection of parser objects
 */
exports.makeServerlessAdapter = function (getParsers) {
  const provider = process.env.CLOUDPROVIDER || 'aws'

  return function (controller) {
    /**
     *
     * @param {"request"|"response"} type
     * @param  {...any} args
     * @returns
     */
    async function parseMessage (type, ...args) {
      const parse = await getParser(type)

      if (typeof parse === 'function') {
        const output = parse(...args)
        console.debug({ func: parse.name, output })
        return output
      }
      console.warn('no parser found for provider')
    }

    async function getParser (type) {
      if (parsers) return parsers[provider][type]
      parsers = await getParsers()
      return parsers[provider][type]
    }

    return async function handle (...args) {
      const { req, res } = await parseMessage('request', ...args)
      const response = await controller(req.path, req.method, req, res)
      return parseMessage('response', response)
    }
  }
}

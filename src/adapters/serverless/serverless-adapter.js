'use strict'

let parsers

/**
 * Decorates `require('@module-federation'.aegis`. Transforms tne input and output for
 * the the `aegis.handle` function. The AWS parser works with API GW running on a Nodejs
 * lambda. Create additional parsers to extend support to other clouds. For better
 * performance, use the WasmEdge runtime instead (under deveopment).
 
 * @param {function():Promise<{function(...args):Promise<string>}>} service - callback starts service (aegis)
 * @param {"aws"|"google"|"azure"|"ibm"} provider - the name of the serverless provider
 * @param {{req:{send:function(),status:function()},res:{}}} parsers - messsage parsers
 * @returns {Promise<{ServerlessAdapter:function(...args):Promise<function()>}>}
 * call `invokeController` to parse the input and call the controller
 */
exports.makeServerlessAdapter = function (getParsers) {
  const provider = process.env.CLOUDPROVIDER || 'aws'

  return function (aegis) {
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
      const response = await aegis.handle(req.path, req.method, req, res)
      return parseMessage('response', response)
    }
  }
}

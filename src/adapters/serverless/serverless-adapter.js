'use strict'

let parsers

/**
 * Start `service` if it hasn't been started
 * already, and wait for it to return the `invoke`
 * function, which allows us to call any controller
 * in the service. Save a reference to it, so if we
 * we are warm-started, we can use it again on the
 * next call without reloading the service.
 * @param {function():Promise<{function(...args):Promise<string>}>} service - callback starts service (aegis)
 * @param {"aws"|"google"|"azure"|"ibm"} provider - the name of the serverless provider
 * @param {{req:{send:function(),status:function()},res:{}}} parser - messsage parsers
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
    function parseMessage (type, ...args) {
      const parse = parsers[provider][type]

      if (typeof parse === 'function') {
        const output = parse(...args)
        console.debug({ func: parse.name, output })
        return output
      }
      console.warn('no parser found for provider')
    }

    return async function handle (...args) {
      const { req, res } = parseMessage('request', ...args)
      const response = await aegis.handle(req.path, req.method, req, res)
      return parseMessage('response', response)
    }
  }
}

'use strict'

/**`
 * Cloud vendor-specific message parser.
 */

const res = {
  send(data) {
    console.log('send', data)
    return data
  },
  status(num) {
    console.log('status', num)
    return this
  },
  set: data => data,
  headers: {},
  type: data => data,
}

// Thanks API GW for this 🙁
function handleMultiline(body) {
  if (!body) return null
  try {
    return JSON.parse(
      body
        .split('\n')
        .map(s => s.trim())
        .join('')
    )
  } catch {
    return body
  }
}

export const aws = {
  request: args => ({
    req: {
      // API GW req format
      path: args.path,
      method: args.httpMethod.toUpperCase(),
      query: args.queryStringParameters,
      params: args.pathParameters,
      body: handleMultiline(args.body),
      headers: args.headers,
      all: { ...args },
    },
    res,
  }),
  response: args => ({
    // API GW res
    isBase64Encoded: false,
    statusCode: args.statusCode,
    headers: args.headers,
    body: JSON.stringify(args.body || args),
  }),
}

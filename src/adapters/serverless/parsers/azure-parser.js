// export const parsers = {
// azure: {
// request: args => ({
//   req: {
//     // API GW req format
//     path: args.path,
//     method: args.httpMethod.toUpperCase(),
//     query: args.queryStringParameters,
//     params: args.pathParameters,
//     body: handleMultiline(args.body),
//     all: { ...args },
//   },
//   res,
// }),
// response: args => ({
//   // API GW res
//   isBase64Encoded: false,
//   statusCode: args.statusCode,
//   headers: args.headers,
//   body: JSON.stringify(args.body || args),
// }),
// }

/**@todo not implemented */
//azure: args => ({ req: { ...args, ...reqContent }, res }),
// }

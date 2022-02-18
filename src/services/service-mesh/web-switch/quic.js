// const { createSocket } = require('quic')

// const requestCert = true
// const calpn = 'echo'

// exports.quicServer = function (securityContext) {
//   const { key, cert, ca } = securityContext

//   const server = createSocket({
//     // Bind to local UDP port 5678
//     endpoint: { port: 5678 },
//     // Create the default configuration for new
//     // QuicServerSession instances
//     server: { key, cert, ca, requestCert, calpn }
//   })

//   server.listen()

//   server.on('ready', () => {
//     console.log(`QUIC server is listening on ${server.address.port}`)
//   })

//   server.on('session', session => {
//     session.on('stream', stream => {
//       // Echo server!
//       stream.pipe(stream)
//     })

//     const stream = session.openStream()

//     stream.end('hello from the server')
//   })
// }

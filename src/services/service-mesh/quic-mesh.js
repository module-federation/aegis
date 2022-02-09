const { createSocket } = require('quic')

const requestCert = true
const calpn = 'echo'

exports.quicServer = function (securityContext) {
  const server = createSocket({
    // Bind to UDP port
    endpoint: { port: 5678 },
    // Default config for QuicServerSession instances
    server: { ...securityContext, requestCert, calpn }
  })

  server.listen()

  server.on('ready', () => {
    console.log(`QUIC server is listening on ${server.address.port}`)
  })

  server.on('session', session => {
    session.on('stream', stream => {
      // Echo server!
      stream.pipe(stream)
    })
    const stream = session.openStream()
    stream.end('hello from the server')
  })
}

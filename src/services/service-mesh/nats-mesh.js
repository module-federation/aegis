const { connect, StringCodec } = require('nats')

// to create a connection to a nats-server:
const nc = await connect({ servers: 'demo.nats.io:4222' })

const StringCodec = require('nats')

// create a codec
const sc = StringCodec()

exports.subscribe = function (eventName, callback) {
  // create a simple subscriber and iterate over messages
  // matching the subscription
  const sub = nc.subscribe(eventName)
  ;(async () => {
    for await (const m of sub) {
      const message = JSON.parse(sc.decode(m.data))
      console.log(`[${sub.getProcessed()}]: ${message}`)
      callback(eventName, message)
    }
    console.log('subscription closed')
  })()
}

exports.publish = function (event, observer) {
  console.log('calling NATS publish')
  nc.publish(event.eventName, sc.encode(JSON.stringify(event)))
}

exports.attachServer = function (server) {
  console.log('web socket server attached to NATS', server)
}

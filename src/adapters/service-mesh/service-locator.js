'use strict'

import Dns from 'multicast-dns'

const debug = /true/i.test(process.env.DEBUG)

export class ServiceLocator {
  constructor ({
    name,
    serviceUrl,
    primary = false,
    backup = false,
    maxRetries = 20,
    retryInterval = 5000
  } = {}) {
    //if (!name || !serviceUrl) throw new Error('missing service name or url')
    this.url = serviceUrl
    this.name = name
    this.dns = Dns()
    this.isPrimary = primary
    this.isBackup = backup
    this.maxRetries = maxRetries
    this.retryInterval = retryInterval
  }

  /**
   * Query DNS for the webswitch service.
   * Recursively retry by incrementing a
   * counter we pass to ourselves on the
   * stack.
   *
   * @param {number} retries number of query attempts
   * @returns
   */
  requestLocation (retries = 0) {
    // have we found the url?
    if (this.url) return

    // if designated as backup, takeover for primary after maxRetries
    if (retries > this.maxRetries && this.isBackup) {
      this.activateBackup = true
      this.advertiseLocation()
      return
    }
    console.debug('looking for srv %s retries: %d', this.name, retries)
    // then query the service name
    this.dns.query({
      questions: [
        {
          name: this.name,
          type: 'SRV'
        }
      ]
    })

    // keep asking
    setTimeout(() => this.requestLocation(++retries), this.retryInterval)
  }

  runAsService () {
    return this.isPrimary || (this.isBackup && this.activateBackup)
  }

  receiveLocation () {
    return new Promise(resolve => {
      console.log('resolving service url')

      this.dns.on('response', response => {
        debug &&
          console.debug({
            fn: this.receiveLocation.name,
            answers: response.answers[0].data
          })

        const fromServer = response.answers.find(
          answer => answer.name === this.name && answer.type === 'SRV'
        )

        if (fromServer) {
          const { target, port } = fromServer.data
          //this.verifySignature(target, this.verifableData)
          const protocol = port === 443 ? 'wss' : 'ws'
          this.url = `${protocol}://${target}:${port}`

          console.info({
            msg: 'found dns service record for',
            service: this.name,
            url: this.url
          })

          resolve(this.url)
        }
      })

      this.requestLocation()
    })
  }

  advertiseLocation () {
    this.dns.on('query', query => {
      debug && console.debug('got a query packet:', query)

      const fromClient = query.questions.find(
        question => question.name === this.name
      )

      if (fromClient && this.runAsService()) {
        const url = new URL(this.url)
        const answer = {
          answers: [
            {
              name: this.name,
              type: 'SRV',
              data: {
                port: url.port,
                target: url.hostname
              }
            }
          ]
        }
        console.info('advertising this location')
        this.dns.respond(answer)
      }
    })
  }
}

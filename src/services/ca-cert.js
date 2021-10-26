const acme = require('acme-client')
const fs = require('fs')

const challengePath = (webroot, token) =>
  `${webroot}/.well-known/acme-challenge/${token}`

/**
 * Function used to satisfy an ACME challenge
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @param {string} keyAuthorization Authorization key
 * @returns {Promise}
 */
function makeChallengeCreateFn (path, dnsProvider) {
  return async function challengeCreateFn (authz, challenge, keyAuthorization) {
    console.log('Triggered challengeCreateFn()')

    // http-01
    if (challenge.type === 'http-01') {
      const filePath = challengePath(path, challenge.token)

      console.log(
        `Creating challenge response for ${authz.identifier.value} at path: ${filePath}`
      )
      console.log(`writing "${keyAuthorization}" to path "${filePath}"`)

      fs.writeFileSync(filePath, keyAuthorization)
      const data = fs.readFileSync(filePath, 'utf-8')

      console.log('file exists', data.toString())
    } else if (challenge.type === 'dns-01') {
      // dns-01
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`

      console.log(
        `Creating TXT record for ${authz.identifier.value}: ${dnsRecord}`
      )

      /* Replace this */
      console.log(
        `Create TXT record "${dnsRecord}" with value "${keyAuthorization}"`
      )
      const provider = await dnsProvider()
      await provider.createRecord(dnsRecord, 'TXT', keyAuthorization)
    }
  }
}

/**
 * Function used to remove an ACME challenge response
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @param {string} keyAuthorization Authorization key
 * @returns {Promise}
 */
function makeChallengeRemoveFn (path, dnsProvider) {
  return async function challengeRemoveFn (authz, challenge, keyAuthorization) {
    console.log('Triggered challengeRemoveFn()')

    // http-01
    if (challenge.type === 'http-01') {
      const filePath = challengePath(path, challenge.token)
      console.log(
        `Removing challenge response for ${authz.identifier.value} at path: ${filePath}`
      )

      fs.unlinkSync(filePath)
    } else if (challenge.type === 'dns-01') {
      // dns-01
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`

      console.log(
        `Would remove TXT record "${dnsRecord}" with value "${keyAuthorization}"`
      )
      const provider = await dnsProvider()
      await provider.removeRecord(dnsRecord, 'TXT')
    }
  }
}

const directoryUrl = !/prod/.test(process.env.NODE_ENV)
  ? acme.directory.letsencrypt.staging
  : acme.directory.letsencrypt.production

/**
 * Provide DNS client and WHOIS implementations
 * @param {import('./dns/dns-provider').DnsProvider} dnsProvider
 * @param {function(domain):{getEmail:function()}} whois
 * @returns {function(domain,email?,challengePath?):Promise<string>}
 */
exports.initCertificateService = function (dnsProvider, whois) {
  /**
   * Provision/renew CA cert
   * @param {string} domain the domain name
   * @param {*} [email] domain admin email address
   * @param {*} [challengePath] path from webroot to challenge data
   */
  return async function provisionCert (
    domain,
    email = `${domain}.admin@gmail.com`,
    challengePath = '/var/www/html'
  ) {
    // Init client
    const client = new acme.Client({
      directoryUrl,
      accountKey: await acme.forge.createPrivateKey()
    })

    // Create CSR
    const [key, csr] = await acme.forge.createCsr({
      commonName: domain
    })

    // Get certificate
    const cert = await client.auto({
      csr,
      email: email || (await whois(domain).getEmail()),
      termsOfServiceAgreed: true,
      challengeCreateFn: makeChallengeCreateFn(challengePath, dnsProvider),
      challengeRemoveFn: makeChallengeRemoveFn(challengePath, dnsProvider)
    })

    console.log(`CSR:\n${csr.toString()}`)
    console.log(`Private key:\n${key.toString()}`)
    console.log(`Certificate:\n${cert.toString()}`)

    return { key, cert, csr }
  }
}

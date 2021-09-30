/**
 * Example of acme.Client.auto()
 */

const acme = require('acme-client')
const { default: whois } = require('./whois')

// const Promise = require('bluebird');
// const fs = Promise.promisifyAll(require('fs'));

function log (m) {
  process.stdout.write(`${m}\n`)
}

/**
 * Function used to satisfy an ACME challenge
 *
 * @param {object} authz Authorization object
 * @param {object} challenge Selected challenge
 * @param {string} keyAuthorization Authorization key
 * @returns {Promise}
 */
function makeChallengeCreateFn (path) {
  return async function challengeCreateFn (authz, challenge, keyAuthorization) {
    log('Triggered challengeCreateFn()')

    /* http-01 */
    if (challenge.type === 'http-01') {
      const filePath = path
        ? `${path}/${challenge.token}`
        : file`/var/www/html/.well-known/acme-challenge/${challenge.token}`
      const fileContents = keyAuthorization

      log(
        `Creating challenge response for ${authz.identifier.value} at path: ${filePath}`
      )

      /* Replace this */
      log(`Would write "${fileContents}" to path "${filePath}"`)
      // await fs.writeFileAsync(filePath, fileContents);
    } else if (challenge.type === 'dns-01') {
      /* dns-01 */
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`
      const recordValue = keyAuthorization

      log(`Creating TXT record for ${authz.identifier.value}: ${dnsRecord}`)

      /* Replace this */
      log(`Would create TXT record "${dnsRecord}" with value "${recordValue}"`)
      // await dnsProvider.createRecord(dnsRecord, 'TXT', recordValue);
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
function makeChallengeRemoveFn (path) {
  return async function challengeRemoveFn (authz, challenge, keyAuthorization) {
    log('Triggered challengeRemoveFn()')

    /* http-01 */
    if (challenge.type === 'http-01') {
      const filePath =
        `${path}/${challenge.token}` ||
        `/var/www/html/.well-known/acme-challenge/${challenge.token}`

      log(
        `Removing challenge response for ${authz.identifier.value} at path: ${filePath}`
      )

      /* Replace this */
      log(`Would remove file on path "${filePath}"`)
      // await fs.unlinkAsync(filewhoisath);
    } else if (challenge.type === 'dns-01') {
      /* dns-01 */
      const dnsRecord = `_acme-challenge.${authz.identifier.value}`
      const recordValue = keyAuthorization

      log(`Removing TXT record for ${authz.identifier.value}: ${dnsRecord}`)

      /* Replace this */
      log(`Would remove TXT record "${dnsRecord}" with value "${recordValue}"`)
      // await dnsProvider.removeRecord(dnsRecord, 'TXT');
    }
  }
}

async function getMaintainerEmail () {
  try {
    const email = await whois(domain).getEmail()
    return email
  } catch (error) {
    console.warn(getMaintainerEmail.name, error)
  }
}

module.exports.provisionCert = async function (domain, email, filePath = null) {
  /* Init client */
  const client = new acme.Client({
    directoryUrl: acme.directory.letsencrypt.staging,
    accountKey: await acme.forge.createPrivateKey()
  })

  /* Create CSR */
  const [key, csr] = await acme.forge.createCsr({
    commonName: domain
  })

  /* Certificate */
  const cert = await client.auto({
    csr,
    email: email || (await getMaintainerEmail(domain)),
    termsOfServiceAgreed: true,
    challengeCreateFn: makeChallengeCreateFn(filePath),
    challengeRemoveFn: makeChallengeRemoveFn(filePath)
  })

  /* Done */
  log(`CSR:\n${csr.toString()}`)
  log(`Private key:\n${key.toString()}`)
  log(`Certificate:\n${cert.toString()}`)
}

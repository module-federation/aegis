'use strict'

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i !== bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

const StringEncoder = {
  /**
   * Get the integer value of the string
   * @param {string} str string to encode
   * @returns
   */
  encode: str => parseInt(bytesToHex(new TextEncoder().encode(str)), 16),
  /**
   * Get the UTF8 string value of the previously encoded integer
   * @param {number} num previously encoded value
   * @returns
   */
  decode: num => new TextDecoder().decode(hexToBytes(num.toString(16))),
}

module.exports = StringEncoder

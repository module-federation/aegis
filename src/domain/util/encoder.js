'use strict'

function stringToUtf8Bytes (string) {
  return new TextEncoder().encode(string)
}

function bytesToHex (bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes (hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i !== bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export const StringEncoder = {
  /**
   * Get the integer value of a string
   * @param {string} str string to encode
   * @returns
   */
  encode: str => parseInt(bytesToHex(stringToUtf8Bytes(str)), 16),
  /**
   * Get the UTF8-encoded string value from the integer
   * @param {number} num previously encoded value
   * @returns
   */
  decode: num => new TextDecoder().decode(hexToBytes(num.toString(16)))
}

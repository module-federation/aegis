export default class AegisError extends Error {
  constructor (msg) {
    super(msg)
    this.aegisError = true
  }
}

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ServiceLocator = void 0;
var _multicastDns = _interopRequireDefault(require("multicast-dns"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const debug = /true/i.test(process.env.DEBUG);
class ServiceLocator {
  constructor({
    name,
    serviceUrl,
    primary = false,
    backup = false,
    maxRetries = 20,
    retryInterval = 8000
  } = {}) {
    this.url = serviceUrl;
    this.name = name;
    this.dns = (0, _multicastDns.default)();
    this.isPrimary = primary;
    this.isBackup = backup;
    this.maxRetries = maxRetries;
    this.retryInterval = retryInterval;
  }
  runningAsService() {
    return this.isPrimary || this.isBackup && this.activateBackup;
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
  ask(retries = 0) {
    // have we found the url?
    if (this.url) return;

    // if designated as backup, takeover for primary after maxRetries
    if (retries > this.maxRetries && this.isBackup) {
      this.activateBackup = true;
      this.answer();
      return;
    }
    console.debug('looking for srv %s retries: %d', this.name, retries);
    // then query the service name
    this.dns.query({
      questions: [{
        name: this.name,
        type: 'SRV'
      }]
    });

    // keep asking
    setTimeout(() => this.ask(++retries), this.retryInterval);
  }
  answer() {
    this.dns.on('query', query => {
      debug && console.debug('got a query packet:', query);
      const fromClient = query.questions.find(question => question.name === this.name);
      if (fromClient && this.runningAsService()) {
        const url = new URL(this.url);
        const answer = {
          answers: [{
            name: this.name,
            type: 'SRV',
            data: {
              port: url.port,
              target: url.hostname
            }
          }]
        };
        console.info('advertising this location');
        this.dns.respond(answer);
      }
    });
  }
  listen() {
    return new Promise(resolve => {
      console.log('resolving service url');
      const buildUrl = response => {
        debug && console.debug({
          answers: response.answers[0].data
        });
        const fromServer = response.answers.find(answer => answer.name === this.name && answer.type === 'SRV');
        if (fromServer) {
          const {
            target,
            port
          } = fromServer.data;
          const protocol = port === 443 ? 'wss' : 'ws';
          this.url = `${protocol}://${target}:${port}`;
          console.info({
            msg: 'found dns service record for',
            service: this.name,
            url: this.url
          });
          this.dns.off('response', buildUrl);
          resolve(this.url);
        }
      };
      this.dns.on('response', buildUrl);
      this.ask();
    });
  }
}
exports.ServiceLocator = ServiceLocator;
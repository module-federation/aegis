"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataSourceIpfs = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _ = require(".");
var _ipfsCore = _interopRequireDefault(require("ipfs-core"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Storage on the distributed web {@link https://ipfs.io}
 */
class DataSourceIpfs extends _.DataSourceFile {
  constructor(map, name, options = {}) {
    super(map, name, options);
  }
  async save(id, data) {
    super.save(id, data);
    this.writeFile();
    return data;
  }
  async find(id) {
    return super.find(id);
  }
  startIpfs() {
    try {
      _ipfsCore.default.create({
        repo: 'aegis-' + Math.random()
      }).then(fs => this.ipfs = fs);
    } catch (err) {
      console.error(err);
    }
  }
  load(hydrate) {
    this.startIpfs();
    if (_fs.default.existsSync(this.file)) {
      try {
        this.cid = _fs.default.readFileSync(this.file, 'utf-8');
        this.readFile(hydrate);
      } catch (error) {
        console.error(this.load.name, error.message);
      }
    } else {
      return new Map();
    }
  }
  async readFile(hydrate) {
    try {
      let data;
      const stream = this.ipfs.cat(this.cid);
      for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        data += chunk.toString();
      }
      return hydrate(new Map(JSON.parse(data), this.revive));
    } catch (e) {
      console.error(e);
    }
  }
  async writeFile() {
    try {
      // add your data to to IPFS - this can be a string, a Buffer,
      // a stream of Buffers, etc
      const {
        cid
      } = this.ipfs.add(JSON.stringify([...this.dsMap]));
      _fs.default.writeFileSync(this.file, cid.toString());
      this.cid = cid;
    } catch (error) {
      console.error(error);
    }
  }
}
exports.DataSourceIpfs = DataSourceIpfs;
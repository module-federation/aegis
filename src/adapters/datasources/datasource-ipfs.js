import ipfs from "ipfs-core/src/components";
import fs from "fs";
import { DataSourceFile } from ".";
const lockfile = require('proper-lockfile');


/**
 * Storage on the distributed web {@link https://ipfs.io}
 */
export class DataSourceIpfs extends DataSourceFile {
  constructor(dataSource, factory, name) {
    super(dataSource, factory, name);
    const self = this;
    lockfile.unlock('/Users/tyson/.jsipfs/repo.lock');
    ipfs.create().then(node => self.node = node);
  }

  async save(id, data) {
    super.save(id, data);
    this.writeFile();
    return data;
  }

  async find(id) {
    return super.find(id);
  }

  load(hydrate) {
    if (fs.existsSync(this.file)) {
      this.cid = fs.readFileSync(this.file, "utf-8");
      this.readFile(hydrate);
    } else {
      return new Map();
    }
  }

  async readFile(hydrate) {
    let data;
    try {
      const stream = this.node.cat(this.cid);
      for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        data += chunk.toString();
      }
      return hydrate(new Map(JSON.parse(data), this.revive));
    } catch (e) {
      lockfile.unlock('/Users/tyson/.jsipfs/repo.lock');
    }
  }

  async writeFile() {
    // add your data to to IPFS - this can be a string, a Buffer,
    // a stream of Buffers, etc
    const results = this.node.add(JSON.stringify([...this.dataSource]));
    // we loop over the results because 'add' supports multiple
    // additions, but we only added one entry here so we only see
    // one log line in the output
    for await (const { cid } of results) {
      // CID (Content IDentifier) uniquely addresses the data
      // and can be used to get it again.
      console.log(cid.toString());
    }
    this.cid = cid;
    //save the CID value
    fs.writeFileSync(this.name, cid.toString());
  }
}

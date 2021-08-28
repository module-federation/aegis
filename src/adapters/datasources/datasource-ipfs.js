import fs from "fs";
import { DataSourceFile } from ".";
import IPFS from "ipfs-core";
const ipfs = IPFS.create();

/**
 * Storage on the distributed web {@link https://ipfs.io}
 */
export class DataSourceIpfs extends DataSourceFile {
  constructor(dataSource, factory, name) {
    super(dataSource, factory, name);
    const self = this;
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
    try {
      let data;
      const stream = ipfs.cat(this.cid);
      for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        data += chunk.toString();
      }
      return hydrate(new Map(JSON.parse(data), this.revive));
    } catch (e) {
      console.error(e)
    }
  }

  async writeFile() {
    // add your data to to IPFS - this can be a string, a Buffer,
    // a stream of Buffers, etc
    const { cid } = ipfs.add(JSON.stringify([...this.dataSource]))

    fs.writeFileSync(this.file, cid.toString())
    this.cid = cid
  }
}

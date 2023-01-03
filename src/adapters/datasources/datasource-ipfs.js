// import fs from 'fs'
// import { DataSourceFile } from '.'
// import IPFS from 'ipfs-core'

// /**
//  * Storage on the distributed web {@link https://ipfs.io}
//  */
// export class DataSourceIpfs extends DataSourceFile {
//   constructor(map, name, options = {}) {
//     super(map, name, options)
//   }

//   async save(id, data) {
//     super.save(id, data)
//     this.writeFile()
//     return data
//   }

//   async find(id) {
//     return super.find(id)
//   }

//   startIpfs() {
//     try {
//       IPFS.create({
//         repo: 'aegis-' + Math.random(),
//       }).then(fs => (this.ipfs = fs))
//     } catch (err) {
//       console.error(err)
//     }
//   }

//   load(hydrate) {
//     this.startIpfs()
//     if (fs.existsSync(this.file)) {
//       try {
//         this.cid = fs.readFileSync(this.file, 'utf-8')
//         this.readFile(hydrate)
//       } catch (error) {
//         console.error(this.load.name, error.message)
//       }
//     } else {
//       return new Map()
//     }
//   }

//   async readFile(hydrate) {
//     try {
//       let data
//       const stream = this.ipfs.cat(this.cid)
//       for await (const chunk of stream) {
//         // chunks of data are returned as a Buffer, convert it back to a string
//         data += chunk.toString()
//       }
//       return hydrate(new Map(JSON.parse(data), this.revive))
//     } catch (e) {
//       console.error(e)
//     }
//   }

//   async writeFile() {
//     try {
//       // add your data to to IPFS - this can be a string, a Buffer,
//       // a stream of Buffers, etc
//       const { cid } = this.ipfs.add(JSON.stringify([...this.dsMap]))
//       fs.writeFileSync(this.file, cid.toString())
//       this.cid = cid
//     } catch (error) {
//       console.error(error)
//     }
//   }
// }

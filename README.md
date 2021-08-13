# aegis

See the [MicroLib](https://github.com/module-federation/MicroLib) repo for a working example of a federation server using Aegis and all documentation. Check back for additional examples and server templates soon.


## Using Aegis

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/module-federation/microlib)

```shell
git clone https://github.com/module-federation/MicroLib
cd microlib
cp dotenv.example .env
yarn
yarn build
yarn start
yarn demo
```

## Contributing
1) Git clone Aegis and run `yarn link`
2) Git clone Microlib and run `yarn link "@module-federation/aegis"`
3) Then follow the steps mentioned above under the Using Aegis section


## Work in Progress
### WebAssembly
New features: 
- Polyglot support (Models can be written in any lang)
- Port to AssemblyScript: Aegis runs on anything WASM does

### AppMesh 
Deecentralized network for Aegis nodes
Supports:
- Object mesh / distributed object cache
- Operations Analytics (understand performance, recommend changes)
- Opertions Automation (e.g. think Kubernetes, but understands the app)
- DataMesh / Federated Learning
Based on:
- Web3 / blockchain / Solid
- Software defined / overlay network
- Mesh-link p2p
- Existng MLops models

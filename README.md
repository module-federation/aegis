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
Enable polyglot and WASM-powered compute 

Overview:
- Support WASM domain, adapter, and services components
- Port Aegis to AssemblyScript for WASM standalone runtimes
- User option to attempt to run their existing TypeScript components in WASM stack machine

### AppMesh 
Deecentralized network for transparent integration and dynamic redistribution of federated software

Overview:
- Distributed object cache over switched mesh network 
- Operations analytics (capture performance at switch nodes, recommend deployment changes)
- Opertions automation (implement recommended changes, including basic orchestration)
- Dynamic redeployment (e.g. of two chatty components into same instance or to bring a component closer to data or users)
- Use Cases: DataMesh / Federated Learning

Based on:
- Web3 / blockchain / Solid
- Software defined overlay network

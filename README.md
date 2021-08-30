# aegis

See the [MicroLib](https://github.com/module-federation/MicroLib) repo for documentation and a working example of a federation server.


## Using Aegis

[![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/module-federation/aegis)

```shell
git clone https://github.com/module-federation/aegis
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
Enable polyglot, WASM-powered compute 

Overview:
- Support WASM domain, adapter, and services components
- Port Aegis to AssemblyScript for WASM standalone runtimes
- User option to attempt to run their existing TypeScript components in WASM stack machine

### AppMesh 
Decentralized network for transparent integration and dynamic redistribution of federated software

Overview:
- Distributed object cache over switched mesh network 
- Operations analytics / MLops (capture performance at switch nodes, recommend deployment changes)
- Operations automation (implement recommended changes, including basic orchestration)
- Dynamic redeployment (e.g. of 2 chatty services to same instance, run closer to users and data )
- Use Cases: DataMesh / Federated Learning

Based on:
- Web3 / blockchain / Solid
- Software defined overlay network

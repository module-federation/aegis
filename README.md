# ÆGIS

See the [MicroLib](https://github.com/module-federation/MicroLib) repo for documentation and a working example of a federation server.


## Using ÆGIS

### Install [<img src="https://github.com/tysonrm/cluster-rolling-restart/blob/main/npm-tile.png">](https://www.npmjs.com/package/@module-federation/aegis)
```shell
npm i @module-federation/aegis
```

### Contribute [![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/module-federation/aegis)

```shell
git clone https://github.com/module-federation/aegis
cd aegis
yarn
yarn build
yarn link 

git clone https://github.com/module-federation/microlib
cd microlib
cp dotenv.example .env
yarn
yarn link "@module-federation/aegis"
yarn build
yarn start
yarn demo
```

# Work in Progress

## WebAssembly
Enable polyglot, WASM-powered compute 

### Overview:
- Support WASM domain, adapter, and services components
- Port Aegis to AssemblyScript for WASM standalone runtimes
- User option to attempt to run their existing TypeScript components in WASM stack machine

## AppMesh 
Decentralized network for transparent integration and dynamic redistribution of federated software

### Overview:
- Distributed object cache over switched mesh network 
- Operations analytics / MLops (capture performance at switch nodes, recommend deployment changes)
- Operations automation (implement recommended changes, including basic orchestration)
- Dynamic redeployment (e.g. of 2 chatty services to same instance, run closer to users and data )
- Use Cases: DataMesh / Federated Learning

### Based on:
- Web3 / blockchain / Solid
- Software defined overlay network

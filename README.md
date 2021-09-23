# ÆGIS

See the [MicroLib](https://github.com/module-federation/MicroLib) repo for documentation and a working example of a federation server.

- title: What is GitHub?
  description: After watching this video, close the first issue in your repository.
  video: https://youtu.be/n2qqgi3fTto


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

cd ..

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
- Support WASM modules as domain, adapter, and service components
- Linter and compiler transform supports compiling existing TypeScript to AssemblyScript
- Support in browser and on any WASM runtime (No Node.js dependency)

## AppMesh 
Decentralized network for transparent integration and dynamic redistribution of federated software

### Overview:
- Distributed object cache over switched mesh network 
- Gracefully degrade or upgrade based on available middleware (plug-in NATs, Kafka, etc).
- No assumption of container networking or provisioning automation, compute delivery nethod abstracted
- Operations analytics / AIOps capture performance at switch nodes, recommends deployment changes)
- Operations automation (implement recommended changes, including basic orchestration)
- Dynamic redeployment (e.g. of 2 chatty services to same instance, run closer to users and data)
- Use Cases: DataMesh, Federated Learning, transparent integration, low-config, 

### Based on:
- Web3 / blockchain / Solid
- Software defined overlay network

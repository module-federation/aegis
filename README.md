[![NPM version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Gitpod][gitpod-image]][gitpod-url]

# ÆGIS

See the [aegis-host](https://github.com/module-federation/aegis-host) repo for documentation and a working example of a federation server.

<div align="left">
    <a href="https://blog.federated-microservices.com" target="_blank">
        <img src="https://user-images.githubusercontent.com/38910830/142773640-5a4d710d-a428-4bfc-9f56-03e90255eb1b.gif" alt="GitHub Video"
        border="10"width="460"height="250"/>
    </a>
</div>

## Consolidate your microservices 
(by running them together in a single process)

- for decreased footprint,
- better performance and
- simpler operations

_without loosing_

- deployment independence,
- language independence
- or component independence (i.e. components remain decoupled)

## Or distribute your components
(across a self-forming service mesh)

- dynamically and adaptively
- outside the datacenter and beyond the edge

_with_

- non-functional, boilerplate code done for you
  - dynamically generated APIs and datasources
  - transparent integration and persistence
  - AI inference against streaming data in real time (AIoT)
  - dedicated thread pools supporting CPU-bound workloads
  - shared memory for efficient processing across threads
  - fast streaming using QUIC protocol and async I/0
  - in-process, self-forming service mesh supporting data federation and other application services.
  - autonomous self-administration (e.g. CA certs provisioned/renewed programmatically)
  - exhaustive portability: Aegis can run as a server, cluster, or serverless function, in the datacenter, at the edge, and beyond (browser, phone, drone, pi, eventually arduino)
- and capabilities that enhance the development experience
  - comprehensive, rapid deployment (deploy in seconds to any compute primitive: serverless, container, IoT, etc)
  - runtime binding and hot reload (e.g. add new functionality on the fly, switch from on-prem to cloud live)
  - zero downtime, zero installation, independent deployment--even for components running in the same process
  - Polyglot, portable, containerless, sandboxed, AoT-compiled modules run safely anywhere, at native speeds
  - decentralized, scalable, "tessellated" hexagonal architecture

### And do it all without deployment automation

You don't need that anymore.

---

## Getting started

### Install [<img src="https://github.com/tysonrm/cluster-rolling-restart/blob/main/npm-tile.png">](https://www.npmjs.com/package/@module-federation/aegis)

```shell
npm i @module-federation/aegis
```

### Contribute

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/github.com/module-federation/aegis) 

or

```shell
git clone https://github.com/module-federation/aegis
cd aegis
yarn
yarn build
yarn link

cd ..

git clone https://github.com/module-federation/aegis-host
cd aegis-host
cp dotenv.example .env
yarn
yarn link "@module-federation/aegis"
yarn build
yarn start
yarn demo
```

----
### Learn
[![Aegis Overview](https://res.cloudinary.com/marcomontalbano/image/upload/v1632364889/video_to_markdown/images/youtube--n2qqgi3fTto-c05b58ac6eb4c4700831b2b3070cd403.jpg)](https://youtu.be/jddhfLA_2k0 "Aegis Overview")

# Roadmap

- More WebAssembly features
- Run on WasmEdge
- Run in the browser
- Run on Arduino
- Addtional service mesh plugins.
- Support ROS2/DDS for low-latency IoT networks
- Point cloud support for LiDAR integration
- PyNode - Python on Node - interpreted, not transpiled
- Support for QUIC, NDI, WebRTC protocols
- Addt'l datasource adapters: Graph, Blockchain, Solid Pod, timeseries
- Adaptive Deployment (AIOps based dynamic infra)
- Data privacy based on Zero Knowledge Proofs
- OCI wrapper for wasm-based runtime
- Federated Module Attestation
- Smart Scaffolding
- Application-based Sharding
- Passwordless authentication
- [Medusa](https://github.com/module-federation/medusa) integration

[npm-image]: http://img.shields.io/npm/v/@module-federation/aegis.svg
[npm-url]: https://npmjs.org/package/@module-federation/aegis
[downloads-image]: https://img.shields.io/npm/dm/@module-federation/aegis
[downloads-url]: https://npmjs.org/package/@module-federation/aegis
[gitpod-image]: https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod
[gitpod-url]: https://gitpod.io/github.com/module-federation/aegis



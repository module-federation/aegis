# ÆGIS 
See the [aegis-host](https://github.com/module-federation/MicroLib) repo for documentation and a working example of a federation server.


<div align="left">
    <a href="https://blog.federated-microservices.com" target="_blank">
        <img src="https://user-images.githubusercontent.com/38910830/142773640-5a4d710d-a428-4bfc-9f56-03e90255eb1b.gif" alt="GitHub Video"
        border="10" width="460" height="250"/>
    </a>
</div>


## Consolidate your microservices 
- for decreased footprint, 
- better performance and 
- simpler operations 
    
_without loosing_
    
- deployment independence,
- language independence 
- or component independence (i.e. components remain decoupled)
  
## Or distribute your components
- dynamically and adaptively
- outside the datacenter and beyond the edge

_with_

- the non-functional, boilerplate code done for you
    * transparent integration
    * transparent peristence
    * built-in, self-forming service mesh
    * autonomous self-configuration (e.g. CA certs provisioned/renewed programmatically)
    * exhaustive portability (Aegis can run as a server, cluster, or serverless function)
    * universal deployment automation (deploy to any compute primitive: serverless, container, etc)
- and capabilities that enhance the development experience
    * runtime binding for hot deployment (e.g. switch out a storage adapter live in prod)
    * zero downtime, zero installation
    * polyglot, portable, containerless, secure, near native performance
    * decentralized, non-layered, highly-scalable, highly composable, "tessellated" architecture 

### And do it all without deployment automation. 
You don't need that anymore.

----

## Using ÆGIS

### Install [<img src="https://github.com/tysonrm/cluster-rolling-restart/blob/main/npm-tile.png">](https://www.npmjs.com/package/@module-federation/aegis)
```shell
npm i @module-federation/aegis
```

### Contribute [![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/github.com/module-federation/aegis) [![Open in Visual Studio Code](https://open.vscode.dev/badges/open-in-vscode.svg)](https://open.vscode.dev/module-federation/aegis)

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
[![Aegis Overview](https://res.cloudinary.com/marcomontalbano/image/upload/v1632364889/video_to_markdown/images/youtube--n2qqgi3fTto-c05b58ac6eb4c4700831b2b3070cd403.jpg)](https://youtu.be/jddhfLA_2k0 "Aegis Overview")

# Current work
    
- More WebAssembly features
- Run on wasm runtime 
- Run in browser
- Run on wasm3
- Built-in, pluggable, fast service mesh
- Support for streaming media and realtime AI inference
- QUIC, WebRTC
- Addt'l datasource adapters: Etherium, Solid Pod
- Support for MLOps

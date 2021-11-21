# ÆGIS

See the [aegis-host](https://github.com/module-federation/MicroLib) repo for documentation and a working example of a federation server.

<div align="center">
    <a href="https://youtu.be/atffJzyP41U" target="_blank">
        <img src="https://user-images.githubusercontent.com/38910830/141614069-20be312c-2408-4ca8-9d59-2f34f6adbd39.gif" alt="GitHub Video"
        border="10" width="460" height="250"/>
    </a>
</div>

## Consolidate your microservices 
- for decreased footprint, 
- better performance and 
- simpler operations 
    
### without losing
    
- deployment independence,
- language independence 
- or component independence (i.e. components remain decoupled)
  
## Or distribute your components
- dynamically and adaptively
- outside the datacenter and beyond the edge

### with

- non-functional stuff done for you
    * transparent integration
    * automated persistence
    * built-in service mesh
    * self-provisioned (e.g. CA certs handled programmatically)
    * execute anywhere (serverless or server, frontend or backend, phone or drone...)
    * deploy anywhere (same process regardless of vendor or platform, lightweight and lightning fast)
- and capabilities that enhance the development experience
    * runtime binding for dynamic changes (switch db adapters live in prod)
    * zero downtime, hot deployment
    * portable, polyglot units of compute that execute at near native speeds
    * decentralized, non-layered (tesellated) architecture

### And do it all without deployment automation. 
You don't need that anymore.

----

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

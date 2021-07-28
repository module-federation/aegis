# aegis

See https://github.com/module-federation/MicroLib for a working example of the federation server and all documentation. Check back for additional examples and server templates soon.

## Using Aegis

```shell
git clone https://github.com/module-federation/MicroLib
cd MicroLib
cp dotenv.example .env
yarn install --frozen-lockfile
yarn build
yarn start
yarn demo
```

## Contributing
1) Git clone Aegis and run `yarn link`
2) Git clone Microlib and run `yarn link "@module-federation/aegis"`
3) Then follow the steps mentioned above under the Using Aegis section

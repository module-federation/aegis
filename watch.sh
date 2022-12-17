cd ../aegis
yarn build
curl -s http://localhost:$1/reload

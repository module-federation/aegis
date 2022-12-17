cd ../aegis
yarn build
curl -s http://localhost:$1/reload
curl -s http://localhost:$2/reload

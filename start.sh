export LOADCACHE=false
cd ../aegis-app
nohup node repo.js &
nohup node repo.js 8001 cache &
cd ../aegis
yarn link
cd ../aegis-host
yarn link @module-federation/aegis
export PORT=80
yarn start

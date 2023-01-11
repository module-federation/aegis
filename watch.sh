cd ../aegis
yarn build
curl -s http://localhost:$1/reload

PID=$(lsof -P -i tcp:8888 | awk '{print $2}')

if [[ ${PID} ]]; then
    curl -s http://localhost:$2/reload
fi

# create symlink between aegis-host and aegis vs using npm

#export FORKRUN_CMD=/Users/tysonmidboe/.nvm/versions/node/v18.12.0/bin/node
#export FORKRUN_ARG=/Users/tysonmidboe/aegis-app/repo.jsjjj

# nvm install --lts
# nvm use --lts

# export FORKRUN_CMD=$NVM_BIN/node
# export FORKRUN_ARG=$PWD/repo.js

# gcc forkrun.c -o forkrun
# ./forkrun
yarn link
cd ../aegis-host
yarn link @module-federation/aegis
yarn start

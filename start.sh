# create symlink between aegis-host and aegis vs using npm

#export FORKRUN_CMD=/Users/tysonmidboe/.nvm/versions/node/v18.12.0/bin/node
#export FORKRUN_ARG=/Users/tysonmidboe/aegis-app/repo.js
export FORKRUN_CMD=/usr/bin/open
export FORKRUN_ARG=http://localhost

./forkrun && yarn link && cd ../aegis-host && yarn link @module-federation/aegis && yarn start

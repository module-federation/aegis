mkdir -p /tmp/mongodb && \
    cd /tmp/mongodb && \
    sudo cp bin/* /usr/local/bin/ && \
    rm -rf /tmp/mongodb && \
    sudo mkdir -p /workspace/db && \
    sudo chown gitpod:gitpod -R /workspace/db
    mongod --dbpath /workspace/db



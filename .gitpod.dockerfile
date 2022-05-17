FROM gitpod/workspace-full

USER gitpod

# Dazzle does not rebuild a layer until one of its lines are changed. Increase this counter to rebuild this layer.
ENV TRIGGER_REBUILD=1

# Install MongoDB
# Source: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu-tarball/#install-mongodb-community-edition
RUN mkdir -p /tmp/mongodb && \
    cd /tmp/mongodb && \
    wget -qOmongodb.tgz https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-5.0.2.tgz && \
    tar xf mongo*.tgz && \
    cd mongodb-* && \
    sudo cp bin/* /usr/local/bin/ && \
    sudo mkdir -p /workspace/db && \
    sudo chown gitpod:gitpod -R /workspace/db && \
    cd /workspace/db && \
    rm -rf /tmp/mongodb 



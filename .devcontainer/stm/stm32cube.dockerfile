ARG BASEIMAGE=mcr.microsoft.com/vscode/devcontainers/cpp
ARG BASETAG=ubuntu24.04

FROM ${BASEIMAGE}:${BASETAG}

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV \
    DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    LICENSE_ALREADY_ACCEPTED=1

# Install apt dependencies
COPY aptDeps.txt /tmp/aptDeps.txt
RUN apt-get update && \
    apt-get install --no-install-recommends -y $(cat /tmp/aptDeps.txt) && \
    rm -rf /var/lib/apt/lists/* /tmp/aptDeps.txt

# ADD NON-ROOT USER user (matching devcontainer.json remoteUser)
# Note: the base image usually already has a 'vscode' user.
# We create 'user' here to match the user's previous configuration.
RUN \
    if ! id -u user > /dev/null 2>&1; then \
        groupadd user && \
        useradd -ms /bin/bash user -g user; \
    fi && \
    echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER user
WORKDIR /home/user

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
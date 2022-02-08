FROM node:12

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ADD . /app/
RUN yarn install

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

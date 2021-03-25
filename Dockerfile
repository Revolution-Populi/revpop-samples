FROM node:12

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends dumb-init \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ADD package.json /app/
RUN cd /app && npm install && \
    echo 'BLOCKCHAIN_URL=ws://blockchain:8090\nCLOUD_URL=http://cloud:5001' > /app/.env
ADD . /app

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

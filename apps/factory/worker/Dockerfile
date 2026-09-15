FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates direnv && rm -rf /var/lib/apt/lists/* \
    && npm install --global @earendil-works/pi-coding-agent@0.85.1 bun@1.4.2
USER node
WORKDIR /tmp

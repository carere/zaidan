FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates direnv \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 \
    libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 \
    libxrandr2 fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @earendil-works/pi-coding-agent@0.85.1 bun@1.4.2
ENV NODE_OPTIONS="--dns-result-order=ipv4first --v8-pool-size=2" RAYON_NUM_THREADS=2
USER node
WORKDIR /tmp

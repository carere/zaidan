FROM zaidan-factory-worker:0.85.1
USER root
COPY fixture-provider.ts /fixture/fixture-provider.ts
RUN rm /usr/local/bin/pi && printf '#!/bin/sh\nexec node /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js -e /fixture/fixture-provider.ts "$@"\n' > /usr/local/bin/pi && chmod +x /usr/local/bin/pi
USER node

FROM node:24-bookworm
RUN apt-get update && apt-get install -y git curl jq chromium ripgrep \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun@1.4.2 @earendil-works/pi-coding-agent@0.84.2 agent-browser@0.33.2
ARG AGENT_UID=1000
ARG AGENT_GID=1000
RUN groupmod -o -g $AGENT_GID node \
    && usermod -o -u $AGENT_UID -g $AGENT_GID -d /home/agent -m -l agent node
ENV HOME=/home/agent
ENV AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
USER ${AGENT_UID}:${AGENT_GID}
WORKDIR /home/agent
ENTRYPOINT ["sleep", "infinity"]

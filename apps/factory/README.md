# Zaidan factory

A standalone Mastra application in the Bun/Moon workspace. It provides Studio,
a persistent LibSQL store, a ChatGPT/Codex subscription-backed planning agent,
and a Docker verification workflow. Issue intake, approvals, repository checkout,
implementation, and pull-request creation are not wired yet.

## Run

From the repository root, install with `bun install`, then run:

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon run factory:dev
```

Open http://localhost:4111 for Studio. `factory:build` bundles the server and
Studio, and `factory:start` serves that build. `factory:tsc` checks types.
Use Node.js 22.19 or newer for Mastra; Moon tasks start in `apps/factory`.
This app pins TypeScript 6 because Mastra's dependency analyzer uses the JavaScript
compiler API. The website continues using the workspace's TypeScript 7.

## Verify Docker

Start Docker, select the `sandbox-check` workflow in Studio, and run it with `{}`.
It creates a unique `node:24-slim` container, writes a file, reads it in a second
command, and removes the container. It may pull the image on first use. No model
credentials, host repository mounts, or GitHub access are needed. Concurrent
runs get separate containers.

If Docker uses a nonstandard socket, set `DOCKER_SOCKET_PATH` in this app's `.env`.
Find the socket with `docker context inspect`; the provider does not automatically
follow the Docker CLI's selected context. Strip the `unix://` prefix when setting
the filesystem path. See `.env.example`.

## Connect the planner

Sign into OpenAI using Mastra Code's `/login` command, as the same operating-system
user running this service. The Code SDK uses its own credential store; an existing
Codex CLI login is not automatically the Mastra Code login. Credentials belong
outside this repository and outside worker containers.

The planner uses `openaiCodexProvider()` with `FACTORY_MODEL` (default
`gpt-5.6-sol`). It uses the subscription route with no API-key fallback. It can
plan from text supplied in Studio, but has no repository tools yet. Starting the
server and running `sandbox-check` do not make model calls.

## Persistence

Workflow state is stored in `apps/factory/.data/mastra.db`; build output goes to
`apps/factory/.mastra`. Both are ignored by Git. Keep `.data` across server
restarts. Future issue workflows must separately manage the lifetime of their
Docker containers and repository checkouts.

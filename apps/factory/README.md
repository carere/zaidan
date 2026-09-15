# Local software factory

Private Node application coordinated by Eve 0.54.3. Pi 0.85.1 runs in the isolated
Docker worker; it is not a website or coordinator dependency. Node 24.21.0 and
Bun 1.4.2 match the [verified compatibility gate](../../docs/examples/pi-eve-compatibility/EVIDENCE.md).

Install from the repository root with `bun install --frozen-lockfile`. Shared
compiler/lint tools and the single lockfile live at the root. This project has
its own TypeScript configuration without Solid JSX or browser globals.

`factory:tsc`, `factory:check`, and `factory:knip` are Moon checks with local-only
caches. Operational tasks must disable caching and keep state in `.factory/`,
`.eve/`, `.data/`, or `.cache/` (all ignored). Do not add Cloudflare bindings or
remote outputs to factory tasks. Coordinator configuration and operational
commands are introduced by the dependent factory tickets.

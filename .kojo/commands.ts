// Run through Workspace so checks inspect the same tree as the agent.
export const commands = {
  install: "bun install --frozen-lockfile",
  test: "bun --bun vitest run",
  lint: "bun --bun biome check --no-errors-on-unmatched .",
  build:
    "bun --bun shadcn build src/registry/kobalte/registry.json --output public/r/kobalte && CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false bun --bun vite build",
  typecheck: "bun --bun tsc --noEmit",
  dev: "CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false bun --bun vite dev --host 0.0.0.0 --port 4173 --strictPort",
} as const;

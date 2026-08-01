#!/bin/sh

set -eu

repository_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# The ignored .env file exists in the local checkout, but not in managed
# worktrees. Managed worktrees receive the token from their setup script.
if [ ! -f "$repository_root/.env" ] || [ -n "${MOON_REMOTE_CACHE_TOKEN:-}" ]; then
  exit 0
fi

if ! command -v direnv >/dev/null 2>&1; then
  printf '%s\n' 'This local checkout has a .env file, but direnv is unavailable. Do not run Moon until direnv is installed and configured.'
  exit 0
fi

if direnv exec "$repository_root" /bin/sh -c 'test -n "${MOON_REMOTE_CACHE_TOKEN:-}"' >/dev/null 2>&1; then
  printf '%s\n' 'For Moon commands in this local Codex task, use `direnv exec "$(git rev-parse --show-toplevel)" moon ...` so the remote-cache token is available. Never print the token.'
else
  printf '%s\n' 'This local checkout has a .env file, but direnv did not load MOON_REMOTE_CACHE_TOKEN. Run `direnv allow` in the repository before using Moon.'
fi

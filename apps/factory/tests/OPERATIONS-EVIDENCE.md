# Telegram operator evidence (#525)

Validation on 2026-09-15 uses the approved workflow and native transport boundaries.
No live Telegram account, external model call, GitHub write, Docker worker change,
or unattended service installation occurred in this ticket.

- **87 deterministic factory tests pass**, including eleven new operator scenarios:
  unauthorized commands; repeated updates and restart; atomic retry receipt before
  response persistence; factory pause/resume and retained ownership; cancellation
  propagated to a controlled worker and descendants; budget/session preservation;
  explicit reauthentication; factory retry target capture; uncertain notification
  and approved triage recovery with exact duplicate-risk confirmations; quiet
  failure/subscription notifications; graph progress and per-head readiness notices.
- The existing native GitHub triage contract additionally proves the configured
  workflow gate prevents a native mutation before an attempted effect is recorded.
- **One real compiled local service fixture passes** with loopback Telegram long
  polling, persisted pause/offset across SIGKILL and restart, no repeated command
  response, graceful polling shutdown, and one failed adapter attachment followed
  by service shutdown without raw adapter error output. Its Eve admission and
  world identity survive the same restart sequence.
- Factory TypeScript, Biome, Knip and workspace Biome checks pass. No dependency or
  lockfile changes. `git diff --check` passes.

All Moon validation used:

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-service
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:tsc factory:check factory:knip workspace:check
```

## Merge-time Eve verification

The pre-#522 base passed the existing two-test compiled Eve suite once. A final
repeat exposed the independently diagnosed pinned Eve orphan step-creation marker:
a quota outcome reached the coordinator immediately before host SIGKILL, leaving
the original Eve run running with only run-created/run-started journal events and
an orphan creation lock. Resuming the preserved coordinator session then waited
without a new dispatch. No assertion or retry timeout was relaxed.

Issue #522 contains the separately reviewed startup quarantine repair and compiled
crash regression. The serial merger must preserve that repair and rerun
`factory:test-eve` on the assembled branch. This ticket does not duplicate or bypass
the repair, or claim an unmodified pre-repair world is reliable.

## Remaining overall acceptance

Real Telegram configuration and a maintainer reply through the final operating
service remain part of #527. The operator tests use a controlled local Telegram
server and scripted authorized replies; they establish routing, persistence and
protocol behavior, not real human or production readiness. The graph projection
is supplied by final service composition from the actual graph records. Read-only
scanning remains the service default, and operator resume never enables live
admission by itself.

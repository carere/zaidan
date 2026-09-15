# Execution capacity acceptance

Validated locally on 2026-09-15 with Node 24.21.0, Pi 0.85.1, Eve 0.54.3 and
Docker 29.4.0 on OrbStack. All Moon commands used the repository's direnv wrapper
and `--cache off`. No live provider calls, selected home skills, GitHub writes,
Telegram messages or unattended service installation were part of these tests.

- `factory:test`: 43 passing tests, including seven capacity/recovery cases at the
  public workflow boundary. Controlled worker results, fake time and real SQLite
  prove four issue workers, an independent four-model pool, per-operation scoped
  capabilities, parent/delegate progress, durable model ownership, two-hour
  configurable active budgets, one transient retry, preserved quota/auth waits,
  cancellation with uncertain external stop, unchanged paused human checkpoints,
  and exclusion of outage time after an already finished quota receipt.
- `factory:test-docker`: seven passing grouped native Docker/Pi contract tests.
  The original network-none fixtures retain containment/session/evidence checks.
  A dedicated synthetic-provider image additionally verifies one shared model
  permit through normal calls, actual native session compaction and both review
  delegates, explicit quota/auth outcomes, and termination before any provider
  dispatch when the permit endpoint is unavailable. Fixture progression is held
  outside model history so native compaction cannot repeat the scripted reads.
- `factory:test-eve`: two passing tests, including the actual compiled Eve host
  with a quota wait, host/coordinator restart, preserved-session resumption, a
  human wait, another restart, and completion in the same Eve run.
- `factory:test-service`: the compiled local service process fixture passes
  SIGKILL/orphan-host recovery, singleton ownership, persistent Eve identity,
  coalesced read-only scans and graceful restarts with the local permit listener.
- Factory TypeScript, Biome, Knip and workspace Biome checks pass.

The quota/auth fixtures use fabricated OAuth-shaped data in the test image. They
verify protocol and state behavior, not current subscription availability. The
separate explicitly authorized live acceptance remains the rollout gate.

Two runtime details were established through actual contract tests/source reads:
Pi 0.85.1 catches provider-hook exceptions, requiring synchronous Pi exit on a
rejected permit to prevent fail-open requests; its native compaction bypasses that
payload hook, requiring a separate compaction lifecycle permit. OrbStack did not
forward a mounted macOS Unix socket; its Docker host alias did reach a listener
bound only to host loopback.

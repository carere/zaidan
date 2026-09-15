# Observed compatibility — 2026-09-15

**Gate passed.** Required authenticated capabilities in
[#512](https://github.com/carere/zaidan/issues/512) were exercised in disposable
fixtures on the maintainer's Mac. No GitHub/Telegram writes or website changes
were involved. This evidence permits the next implementation ticket; it does
not claim that the complete factory exists.

## Pins

| Component | Observed version |
| --- | --- |
| Eve | 0.54.3 |
| Pi coding agent / Pi AI | 0.85.1 |
| Node, host and Linux ARM64 worker | 24.21.0 |
| Bun | 1.4.2 |
| Docker server / context | 29.4.0 / `orbstack` |
| AI SDK (Eve dependency, no coordinator inference) | 7.0.99 |
| Native lock library | proper-lockfile 4.1.2 |
| TypeScript / Node typings | 7.0.2 / 25.3.0 |
| Effective subscription configuration | `openai-codex / gpt-6-astra / high` |

The Dockerfile pins the Node base manifest and Pi release. The observed image
configuration digest was
`sha256:6c91afd33a76425aa0bfb1a8b53e7f7c41d25656c1001330818cda62e4a94e48`.
The same build exported manifest-list digest
`sha256:a8ebcca733c97e6e1ef74227b5f51d928b626ec70d8731f83b7279484ae07787`,
which OrbStack returned as the container's inspected `Image` value and the
sanitized containment evidence records as `imageId`. These identify different
OCI objects from the same build.
The example's Bun lockfile pins its standalone coordinator dependencies.

## Required observations

| Gate requirement | Actual result |
| --- | --- |
| Installed Eve docs and code-controlled workflows | Read bundled index, self-hosting, workflow-tool and human-input guides. Eve built the custom route/workflow application; the coordinator's local model stub rejects every inference call. |
| Real subscription inference | Non-root Docker Pi returned `SUBSCRIPTION_OK` with the selected subscription provider/model/reasoning. RPC then performed real tool execution. No API-key environment variables or billed provider fallback were supplied. |
| Explicit unsupported settings | Unknown native model rejected. Pi accepted an invalid reasoning setter string, so the fixture now rejects unsupported provider/model/reasoning before credentials or Docker; three negative CLI tests verify that boundary. RPC verifies effective configuration before prompting. |
| Persistent/concurrent authentication | Two concurrent Docker processes used native Pi credential storage against the selected persistent auth file, with a shared native lock. Exactly one real refresh call occurred; both authenticated and read expiry `1790302500370`. Source credential persistence was verified. A subsequent fresh worker and delegate successfully inferred using the renewed credential. |
| Skill and relative resource | `/skill:compatibility-fixture` discovered and executed the fixture skill, read its sibling resource, and wrote exactly `relative-resource-512` plus newline to the result file. |
| Delegated review and typed events | Separate Pi reviewer ran inside the same sandbox as UID 1000 and returned `REVIEW_OK`. Typed review completion and checkpoint request each occurred once. |
| Worker and delegate cancellation | A cancellation probe started delegated execution, sent RPC abort, received parent idle and delegated cancellation, and removed the container to terminate all descendants. The harness verifies container absence before recording success. |
| Durable question across both restarts | Eve persisted `zaidan-512-restart-1`; the worker container was removed and the coordinator/launcher stopped. Restarted Eve accepted only the intended question/answer and launched a replacement worker with the original session ID. |
| Original session, no duplicate execution | Workflow `wrun_01M2HD9JPHYCMTCV737CD7D0AB` completed with session `01a0a2d1-d0e2-75aa-b8bf-6df8f3adcf7f`. `answer.txt` contained `blue`. Review and checkpoint counts stayed one; a duplicate answer failed. |
| Sandbox boundary | Docker inspection verified UID/GID 1000, unprivileged mode, all capabilities dropped, no-new-privileges, read-only root, and only selected fixture/auth mounts. There was no host-home directory, Docker socket, GitHub credential, or Telegram credential mount. |
| Secret handling | Scanned 36 evidence/workspace files, including Pi transcripts, against the real access/refresh tokens from the exercised fixtures in memory: zero occurrences outside dedicated auth storage. Tool output contained metadata only. |

## Compatibility findings and limits

- Eve requires model metadata even when only custom workflow routes are used.
  A throwing local model implementation plus explicit context-window size builds
  successfully and makes accidental chat fail locally.
- Pi's native storage rereads OAuth state under `proper-lockfile` and keeps the
  lock across refresh/persistence. Separate token copies are insufficient for
  parallel refresh; retain shared storage and lock ownership in the factory.
- Pi RPC uses LF-delimited JSON. `run.mjs` parses LF directly, avoiding Node
  readline's additional Unicode separators.
- Eve's consumed-hook error surfaced as HTTP 500, without duplicate execution.
  The production checkpoint adapter should classify stale/consumed replies.
- One exploratory Eve run failed because `/tmp` and `/private/tmp` aliasing
  bypassed the runner's entry-point check. Canonicalizing the executable path
  fixed it; the successful restarted workflow is the one recorded above.
- This tests restart at a persisted human wait, not every possible interruption
  during a filesystem write or external side effect. Those stronger recovery
  requirements remain assigned to the later workflow/publication tickets.
- The authenticated gate is separate from deterministic tests. Its model/tool
  calls use subscription capacity and must be invoked deliberately.

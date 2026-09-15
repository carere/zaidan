# Captured worker contract evidence — 2026-09-15

## Observed

The real Docker/Pi contract suite passed on OrbStack Docker 29.4.0 using Node
24.21.0 and Pi 0.85.1. The normal worker image also reports Bun 1.4.2.
The three grouped tests exercised six isolated fixture issues, including:

- Native explicit invocation of a hidden captured skill and its sibling file.
- A persisted human question, closed/reopened coordinator store, deleted source
  skill, and resumption of the original Pi session/snapshot.
- A real checkpoint commit, successful selected checks, independent standards
  and spec Pi delegate sessions, and final Git bundle with commit/tree/hash
  evidence. A fresh credential-free Docker verifier checks the candidate.
- Explicit rejection of failed review, a missing captured dependency, failed
  validation, and a candidate changed after its review.
- Cancellation during a delegated tool: the whole container and descendants
  stop, while sessions and checkout remain. Inspection verifies UID 1000,
  read-only root, dropped capabilities, no-new-privileges, selected mounts,
  and absence of publication/Telegram/API-key environment variables.

The contract image uses a deterministic provider registered inside **real Pi**;
networking is disabled and its OAuth-shaped fixture file contains only fake
strings. It proves protocol, resources, tool bridges, sessions and evidence
handling without a subscription call. The injected provider exists only in
`tests/Dockerfile`, separate from the normal runtime image. It has a bounded
protocol-step guard so unexpected tool failures cannot create an endless test.

One actual compatibility defect found by these tests was that Pi's `--tools`
selection also filters extension tools. Review delegates now explicitly include
`review_result` and `Skill`; merely loading the extension was insufficient.
Another was a Docker list/inspect race during cancellation. Reconciliation now
confirms disappearance with a fresh successful list, preserving unknown errors.

The real selected home-skill preflight also passed locally: four original skill
directories, 12 captured files, complete declared supporting resources and hash
verification. This local check made no model call.

## Live execution limit

The explicitly invoked `tests/live-worker.ts` fixture captures the existing
`implement`, `tdd`, `code-review`, and `codebase-design` skill directories and a
small generated greeting specification. It is ready to run against the normal
worker image with the selected native subscription auth file. **No live call
from this new fixture has occurred**: automatic approval review rejected it
because transmitting those local skill trees and fixture context to the
external OpenAI provider requires direct user authorization for that payload
and destination. The rejection was repeated after presenting the inspected
bounded payload and #511/#515 specification authorization.

Authenticated subscription inference and shared native credential refresh were
previously established by #512; see
`docs/examples/pi-eve-compatibility/EVIDENCE.md`. Those observations do not claim
that this fresh captured-worker fixture has run with the real provider.

## Reproduction

```sh
docker build -t zaidan-factory-worker:0.85.1 -f apps/factory/worker/Dockerfile apps/factory/worker
docker build -t zaidan-factory-worker-test:0.85.1 -f apps/factory/tests/Dockerfile apps/factory/tests
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test factory:test-docker factory:tsc factory:check factory:knip
```

The live fixture is deliberately excluded from Moon's normal test tasks. After
explicit approval for its selected payload/destination, invoke it with the
selected auth-file path and home-skills-directory path. It retains its fixture
state and emits a sanitized evidence report plus a zero-secret-occurrence check.

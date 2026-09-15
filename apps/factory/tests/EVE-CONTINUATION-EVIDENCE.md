# Durable Eve continuation evidence — #524

An issue can need a new graph evaluation after its earlier Eve owner has
completed. `queueEveContinuation(run, operations, continuationId)` records the new
owner and its unique start intent in the same SQLite transaction as the new
phase. It preserves the original factory run, issue snapshot, resource capture,
Pi session and prior results. Previous Eve identities remain in
`eveOwnerHistory`; the current one is `eveContinuationId` plus `eveRunId`.
Reusing the current continuation ID is idempotent; reusing an older ID is rejected.

The engine finds owners by both `factoryRunId` and `factoryContinuationId`,
exhausting pagination. A missing continuation attribute identifies the original
owner. Concurrent starts for one pair join one promise; lost start responses
reconcile that exact pair after restart. This lets one factory admission have
historical completed Eve owners without treating them as duplicate active starts.

Compiled workflow drive and wake steps pass their immutable continuation ID.
The actual loopback service rejects stale owners with a terminal response before
any drive or wake effect, including while startup reconciliation is incomplete.
The policy boundary also fences direct `driveOwned` and `recoverWakeOwned` calls.
Worker acquisition checks current owner and phase again after authorization
awaits. Calls for the same owner still coalesce, and a new owner waits for an
in-flight earlier drive to settle before dispatching. The old owner's response
cannot accidentally enter the new owner's human checkpoint.

The real compiled Eve fixture uses the production HTTP bridge and local service:

1. The original owner completes an issue and reaches Eve's terminal state.
2. A new phase and continuation intent are persisted, then both hosts restart
   before the new start effect.
3. Normal service startup automatically starts the new owner, reaches a human
   checkpoint on the same factory run/session, and deliberately loses the start
   response after concurrent starts return the same remote identity.
4. A second restart reconciles that exact owner without another start or worker.
5. Stale original-owner drive/wake requests have no effects. The authorized
   checkpoint answer resumes the new owner to completion with one wake and one
   notification. Original issue and resource identities remain unchanged.

The suite also retains the existing quota/wake restart and graph-pending replay
fixtures. All model/worker results and credentials are synthetic; compiled Eve,
SQLite, process kills/restarts and loopback HTTP are real. No provider, GitHub or
Telegram call is made.

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-eve
```

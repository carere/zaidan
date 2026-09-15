# Pinned Eve step creation recovery — 2026-09-15

The existing real compiled-Eve quota/restart test exposed an actual durability gap
in bundled `@workflow/world-local@5.0.0-beta.43` (Eve 0.54.3). Immediately after the
coordinator committed a quota receipt, SIGKILL could interrupt local-world step
creation. The retained world contained a running run, only run-created/run-started
journal events, an empty step `.created` marker, and no corresponding step entity.
Restart found the same native run but never called the coordinator again.

A retained-world differential isolated the cause. The unchanged copy remained
running with zero coordinator calls after ten seconds. Removing only that orphan
creation marker from a separate stopped copy let native startup finish the same run
with one coordinator call in 351 ms. No workflow restart, replacement run, queue
reset, or data deletion was needed. Source inspection confirmed the native ordering:
exclusive creation marker, step entity, then journal event. The fixture's interruption
landed between the first two writes.

`prepareEveWorld` implements the narrow compatibility repair before the supervised
host imports Eve, under existing exclusive service ownership and a host PID claim.
It only quarantines an empty untagged creation marker for a valid active run when
both entity and step journal evidence are absent. It verifies the pinned world
version first. Recorded steps, journaled steps, terminal runs and other tombstones
remain unchanged. Malformed or unknown state refuses automatic repair. Diagnostic
receipts and original marker bytes remain outside native world directories.

Validation after repair:

- Deterministic startup fixtures verify orphan repair, idempotence, live-owner
  rejection, preserved existing/journaled/terminal markers and fail-closed malformed
  or unknown-version state.
- The original compiled Eve test passes quota wait, host/coordinator restart,
  same-run resume, durable human wait, another restart, and original-session completion.
- The new compiled graph test keeps a completed child polling through host restart
  until graph delivery actions finish, without creating a second Eve run.
- The actual local service SIGKILL/restart test passes supervised orphan-host cleanup
  and singleton ownership with the repair in its production bootstrap.

These tests use local generated fixture data and controlled worker/HTTP boundaries.
They make no live model-provider, GitHub or Telegram claim. This repair is specific
to the observed pinned native persistence ordering; it is not a general journal
repair mechanism and must be revalidated on a runtime upgrade.


## Interrupted running steps and local ownership leases

The #525 combined merge check exposed a second independent crash window. The
human answer was present in coordinator SQLite and Eve's `hook_received` journal,
but a `recoverWake` step interrupted by SIGKILL retained the previous host's
ownership. The pinned runtime's default inline ownership lease is 860 seconds.
A copied unchanged world remained running without coordinator calls after ten
seconds. Changing only the supported `WORKFLOW_INLINE_OWNERSHIP_LEASE_SECONDS`
setting to `1` let the same copied run complete in 360 ms. No journal repair applies
to this case: its running step and recorded ownership are valid history.

The supervised single-host service and compiled fixture use the documented
one-second lease. A stronger experiment showed native HTTP replay can also occur
while an earlier request remains in flight; the setting alone is insufficient.
`IssueWorkflow` therefore coalesces concurrent `drive` and `recoverWake` calls per
run until each effect settles, with cleanup on rejection as well as success.
Durable operation identities and transactional claims still cover process restart.
Native request replay is allowed; it does not duplicate live worker or wake effects.

Regression evidence:

- A forced stop inside the compiled native `recoverWake` step failed before the
  lease setting, reproducing the saved-answer stall within the existing timeout.
- The compiled test holds the actual engine wake effect while receiving the native
  hook queues replay, waits beyond the local lease, and verifies one wake effect.
  It then kills the host with the step still running, reopens the coordinator,
  completes the original Eve run, and verifies exactly three worker phases, one
  retained session and two original notifications.
- A controlled-time workflow test advances beyond the 30-second durable claim
  while a worker and then a wake remain live. Concurrent calls share their results;
  neither effect restarts when the claim timestamp expires.
- The real supervised service restart fixture continues to pass with the same
  environment setting, persistent Telegram pause state and one-time attachment.

These checks use generated local fixtures and loopback transport. The Docker/Pi
worker implementation and trusted Git transport are unchanged by this correction.

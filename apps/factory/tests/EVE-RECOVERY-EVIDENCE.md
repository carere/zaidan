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

# Whole-graph acceptance evidence

Issue #523 adds an explicit final sandbox phase after published implementation
leaves close. It does not perform the maintainer's final merge.

## Public workflow boundary

The actual SQLite issue and graph stores, trusted bare Git adapter and disposable
local Git repositories exercise controlled worker/GitHub outcomes through
`IssueWorkflow`. Tests cover:

- One final phase on the assembled head, with unchanged admitted issue, session,
  resource snapshot and accumulated execution budget.
- Required validation and both independent reviews before readiness; rejected
  evidence remains a failed, explicitly retryable attempt.
- Changed source revisions and revoked parent authorization invalidating readiness.
- Actual Git main containment before closing root and intermediate specification
  parents, including recovery after a lost closure response.
- Changed approved briefs preventing stale parent closure after an observed merge.
- Readiness and notification response loss, with one completed external action and
  independent recoverable receipts.
- Factory pause preserving acceptance evidence until explicit resume.
- Acceptance bundle preparation failure retaining the original Eve workflow until
  its next phase is durably queued.
- Bounded concrete PR descriptions rejecting injected automatic closure directives.

Native GitHub protocol tests use only a local HTTP server and fabricated token.
They exercise GraphQL ready/draft transitions and REST PR description updates;
there is no final-merge endpoint in the publication adapter.

## Real Docker/Pi contract

`factory:test-docker-acceptance` runs Pi 0.85.1 in unprivileged, network-disabled
Docker using a dedicated deterministic provider image and fabricated OAuth-shaped
data. Selected skills are tiny fixture files, not private home-directory skills.
The same original session resumes after a human checkpoint. A separate container
without network or authentication verifies the final exact head/tree, resource and
issue identity, acceptance-bound checks/reviews, exported bundle, and PR report.

The fixture accepts a graph with review base equal to its head without adding a
commit. It rejects modified/committed checkout state, ordinary implementation
completion, changed commit/check provenance, missing or oversized report content,
HTML publication markers and bare/cross-repository/URL closing directives.
The retained full input includes root and intermediate specifications and briefs.

The implementation, triage and conflict-integration Docker regression groups also
pass on the acceptance runtime. Report-only followup changes affect the acceptance
branch; the affected acceptance group is rerun after integration.

### Observed transient limitation

One initial fixture run returned a generic Docker error during the final restored
receipt verification. That initial fixture self-cleaned, so its precise cause could
not be recovered. Two subsequent full acceptance runs passed. Forty fresh verifier
containers alternating deliberately corrupted and restored valid receipts produced
forty expected results and no unexpected failure. No speculative runtime repair was
made. The fixture now preserves failed synthetic state and verifier diagnostics for
future diagnosis. This isolated observation is not presented as a proven race.

## Scope of evidence

These are real Docker/Pi execution and public policy tests with controlled external
outcomes. They do not claim live subscription inference, real Telegram delivery or a
human's live main merge. The authenticated complete-service fixture, rollout policy
and ongoing edited/reopened/moved graph re-evaluation belong to their separate
acceptance gates. Production publication credentials never enter the worker or its
verification container.

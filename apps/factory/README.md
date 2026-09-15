# Local software factory

Private Node application coordinated by Eve 0.54.3. Pi 0.85.1 runs in the isolated
Docker worker; it is not a website or coordinator dependency. Node 24.21.0 and
Bun 1.4.2 match the [verified compatibility gate](../../docs/examples/pi-eve-compatibility/EVIDENCE.md).

Install from the repository root with `bun install --frozen-lockfile`. Shared
compiler/lint tools and the single lockfile live at the root. This project has
its own TypeScript configuration without Solid JSX or browser globals.

`factory:tsc`, `factory:check`, and `factory:knip` are Moon checks with local-only
caches. Operational tasks must disable caching and keep durable state in an absolute
persistent directory outside Git and disposable workers. Do not add Cloudflare bindings or
remote outputs to factory tasks. See [local service operations](service/README.md) for configuration, lifecycle,
scheduling, logs, backup, and the optional uninstalled launchd template.

## Durable issue workflow

The public boundary is `IssueWorkflow` in `src/index.ts`. Supply a
`SqliteWorkflowStore` and controlled or real worker, notification, Eve engine,
and clock adapters. `admit(issue)` allocates one stable run/session for the
provider issue ID and admitted revision. `observe(runId)` and `admissions()` expose
persisted state; Eve invokes `drive(runId)` to dispatch workers and advance phases.
A completed candidate is an execution result, not evidence of integration,
GitHub closure, or PR readiness.

The coordinator never executes models or tools. Worker `dispatch` and `resume`
return typed outcomes, not RPC acknowledgments. Every worker/notification
operation carries a durable operation ID. Adapters must make repeated operations
with that ID idempotent and reconcile lost responses; lookup failure must throw,
not masquerade as an absent operation. Resume receives the original session and
explicit checkpoint identity, question and accepted answer.

Use an absolute SQLite path under a persistent directory outside the repository
and disposable containers. The database stores admission identity, original
session paths, operation claims/leases, checkpoint state and receipts. Transactions
commit question plus notification intent, or answer plus wake intent, together.
No SQLite transaction remains open during external work. An answer must match
run, issue ID, admitted revision and checkpoint ID. Invalid, duplicate and stale
answers cannot consume a new question.

Call `recover()` when the coordinator starts. It reconciles pending engine starts,
notifications and wake requests; the durable Eve workflow continues worker phases.
A wake that arrives before hook registration remains pending. Eve calls
`recoverWake(runId)` after registering the hook so an early accepted answer is not
lost. The engine uses factory run attributes to find an existing Eve run before
starting another. A live uncertain start cannot be stolen merely because its
lease expired; recovery can still recover its receipt. Process death permits
reclaim after lease expiry. Worker and notification retries always retain their
original operation IDs.

Run deterministic public-boundary tests with a fake clock and real SQLite files:

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test
```

### Compiled Eve host

`agent/` is a code-controlled Eve agent with a locally rejecting model and no
default tools. `createEveEngine({baseUrl})` connects the coordinator to its
`/factory/engine/{start,find,wake}` routes. The host needs
`FACTORY_COORDINATOR_URL`; that loopback service routes POST `/factory/drive` to
`workflow.drive(runId)` and POST `/factory/wake-pending` to
`workflow.recoverWake(runId)`. Bind both services to loopback. GitHub discovery is configured at the workflow boundary below; operator
transports are supplied by later factory tickets.

Run exactly one Eve host for each persistent deployment directory. Build and run
it from that external directory and preserve its `.eve/.workflow-data` across
restart. Pinned Eve 0.54.3 overrides `WORKFLOW_LOCAL_DATA_DIR`; the compiled fixture
verifies the actual default world directory instead. Keep Eve's `/eve/` and
`/.well-known/workflow/` routes available alongside custom factory routes.

The real-host suite compiles these production workflow directives, dispatches a
controlled worker, observes a durable hook, kills the Node host, reopens SQLite,
restarts Eve, and resumes the same session to completion. It also loses a start
response and races concurrent HTTP start retries. It never calls a model or live
GitHub/Telegram services. Failed fixture evidence stays in the printed temporary
directory; successful fixtures are removed.

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-eve
```

## Read-only GitHub discovery

Configure `IssueWorkflow` with `discovery: createGitHubDiscovery({ repository:
"carere/zaidan", token })`, then call `workflow.scan()`. The optional token needs
only Issues read access; keep it in coordinator memory and out of worker mounts
and logs. The transport uses GET requests with GitHub API version `2026-03-10`.
It follows every native issues, sub-issues, and blocked-by page and walks linked
parents and prerequisites, including closed and cross-repository issues. PRs are
excluded. Authentication, malformed responses, pagination loops, and conflicting
copies of an issue fail the scan instead of returning partial admissions. Native
relation totals must match captured lists. A 404 from GitHub's parent endpoint
denotes no parent only when the issue has no native parent URL; a known but
unreadable parent fails the scan. Failures from issue lists,
sub-issue lists and dependency lists are never treated as empty results.

Concurrent calls on a workflow share one scan. Before reading GitHub, scanning
reconciles existing worker operation receipts and pending engine/notification/wake
intents. It never dispatches or resumes a new worker. The same durable admission
store suppresses previously admitted revisions, including completed revisions;
an earlier active revision blocks a second proposal for that issue. Restarting
retains those identities. An unreadable worker receipt fails the scan and allows
the next trigger to retry; it is not evidence that the old worker never ran.

Results contain the complete `snapshot`, per-issue `decisions`, and
`mode: "read-only"`. Routes are `triage`, `implementation`, `coordinator`,
`ignored`, `conflict`, `blocked`, or `already-admitted`. These are local outcomes,
not GitHub labels. Implementation is a routing proposal: graph prerequisites,
starting Git revisions, consequential-action rechecks, and live rollout gates
must still approve admission. No scan writes to GitHub or admits a run. Controlled
fixtures can explicitly pass a decision's `admission` to `admit` with a known `startingRevision`
and `reviewBase`; the existing admission identity prevents duplicate dispatch.
The proposed admission captures route, body, approved brief and ancestor
specification bodies in `sourceContent` for immutable worker resource snapshots.

Only `needs-triage` proposes triage. An unambiguous `ready-for-agent` authorizes
implementation when its captured body contains substantive scope and acceptance
sections (for example `What to build` plus `Acceptance criteria`, or
`Problem Statement` plus `Testing Decisions`). HTML template comments do not count.
This honors the repository's existing approved specifications without introducing
a second approval ledger. The optional `approvedBriefs()` adapter method supplies
already approved triage artifacts such as AGENT-BRIEF.md or a GitHub comment;
each must identify its source, contain nonempty content and match the issue's
`contentRevision`. The triage adapter owns obtaining and recording human approval.
Unsupported or missing briefs produce an explicit blocked outcome.

Parents with native children coordinate rather than implement. Every ancestor
must have an approved brief and unambiguous `ready-for-agent` before descendant
implementation is proposed. Parent triage can run while implementation
prerequisites remain unresolved. Other workflow labels never authorize
implementation; conflicting canonical labels require maintainer direction.

`issueId` is the stable GitHub node ID; `databaseId` retains the numeric REST ID.
`contentRevision` hashes title and body for approved-brief matching. Each issue's
`revision` also covers state/reason, labels, native relation IDs, source/location
and GitHub update time. The overall snapshot revision includes every issue
revision. Ordering of pages or labels does not change these identities. Snapshot
content is captured in the result for later persistence and action rechecks;
GitHub does not offer an atomic multi-issue snapshot, so consequential actions
must re-read it. Transport contracts use a real local HTTP server without live
GitHub writes or model calls.

Native API references: [issues](https://docs.github.com/en/rest/issues/issues),
[sub-issues](https://docs.github.com/en/rest/issues/sub-issues), and
[dependencies](https://docs.github.com/en/rest/issues/issue-dependencies).

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

## Read-only graph planning

After a complete `scan()`, call `workflow.planGraph(rootIssueId, integration?)`.
Use the top-level issue's stable ID; a standalone issue is a one-leaf graph.
The plan lists `specificationIds`, implementation `leaves`, and all
`eligibleLeaves` together. It expands prerequisites on internal specifications
into their implementation descendants, inherits ancestor prerequisites, and
checks the whole prerequisite chain. Cycles, unreadable relationships, and
ambiguous membership pause affected work and its dependents. Readable external
prerequisites remain explicit `waiting-external` outcomes until the external
delivery ticket supplies verification.

`GraphIntegrationState` is trusted recorded delivery evidence from the integration
boundary: graph ID, matching `graphRevision`, published `head`, `reviewBase`,
per-leaf exact issue revision and integration commit, and commits verified
reachable from that exact head. Closure alone supplies none of that evidence.
A missing head, stale revision, contradictory receipt, or missing commit prevents
eligibility. Every eligible leaf includes its explicit `startingRevision` and
an admission proposal with that head and review base. Planning neither admits
workers nor writes to GitHub; consequential actions still require current
source/authorization/head rechecks and the live rollout gate.

Call `planGraph` again as soon as integration records change. It recomputes from
the captured complete discovery snapshot and current durable admissions without
waiting for the next discovery interval. Returned plans cannot mutate the captured
source. A failed refresh invalidates planning until a complete scan succeeds.
The graph revision hashes member identities, specification/source content, and
native membership/dependencies; issue lifecycle metadata remains checked by the
exact per-issue revision. After factory-owned closure changes that revision, the
integration boundary must reconcile and record the observed issue revision; it
must never relabel arbitrary edited/reopened source as delivered. Durable delivery
storage, Git containment verification, and publication recovery belong to the
integration ticket rather than this read-only planner.
## Captured skills and Docker workers

`IssueWorkflowOptions.captureResources` captures resources before a new issue revision is
admitted. Use `captureResources` with explicit selected skill paths, the entry name,
required validation commands, and the repository path. It copies whole directories,
materializes selected symlinks, validates the declared maintainer-skill dependency
closure and fixed Markdown links, and records original source paths plus content hashes.
Duplicate frontmatter names require one source marked `selected: true`. Additional
resources can be given explicit logical targets; repository skill trees preserve their
repository-relative paths. A missing or changing required resource fails admission.

The immutable manifest contains the admitted issue (including captured scope supplied
by discovery), tracked repository instructions, domain documents, ADRs, and the required
checks. The durable run stores its manifest reference. Re-admission/resumption of the
same issue revision never reads current home skills again. New dependencies or changed
requirements need a new admitted revision. Generic dynamic references cannot be inferred
reliably: declare their skills/resources in the capture configuration.

Build the worker locally:

```sh
docker build -t zaidan-factory-worker:0.85.1 -f apps/factory/worker/Dockerfile apps/factory/worker
```

`DockerPiWorker` implements dispatch/resume/reconcile plus cancellation. Configure
absolute persistent state, a trusted source repository, and exactly the selected native
Pi `openai-codex` OAuth file and a shared lock directory. All instances in one
coordinator process share a reference-counted native source-file lock; all containers
mount the same selected file and native container-lock directory. This retains the
concurrent refresh contract established by #512. It never copies independent renewing
auth files or supplies GitHub/Telegram credentials. The provider/model/reasoning are
pinned to `openai-codex / gpt-6-astra / high`; unsupported effective settings fail.

The per-issue checkout, branch, original session file, delegate sessions, streamed
events, and outcome receipts survive container replacement. The runtime invokes Pi's
native explicit skill command, disables implicit live context/resource discovery,
and appends captured original repository instructions. `Skill`, `spawn_agent`, and
`request_user_input` bridge source-skill loading, container-local delegates, and durable
human waits. Native Pi UI questions also become durable workflow checkpoints; a restart
uses the stored question/answer and original session, never a stale Pi UI request ID.

`checkpoint_commit` creates real reviewable work before `code-review`. Required checks
and two independent review axes identify the exact commit, tree, review base, issue
revision and snapshot. Changed/dirty candidates, failed checks/reviews and missing
resources cannot produce successful completion. Evidence survives a phase pause but
must still match the final candidate. The completed candidate exports a Git bundle
with SHA-256 and a host artifact path. Import that bundle into a coordinator-owned bare
repository with trusted configuration; never execute host Git in the worker's checkout.
Candidate verification itself runs in a fresh credential-free, network-disabled Docker
container. A checkpoint commit or completed worker outcome does not publish or close an
issue.

The worker's optional `permitUrl` connects #516's model-call capacity transport. It
acquires before a provider request and releases on assistant `message_end`, before
delegated tools wait, plus end/error/shutdown cleanup. Worker admission limits, active
budgets, retries, and authenticated permit transport belong to that coordinator policy.
Pi's own automatic retry is disabled so it cannot compete with the durable retry policy.

### Worker contract checks

The deterministic workflow suite includes captured resource identity and preflight
failures. The dedicated Docker test image injects a deterministic provider into **real
Pi**, with networking disabled and fake credentials. It checks native hidden-skill
expansion, relative resources, original-session restart, independent delegate sessions,
committed validation/review evidence, explicit failure and container-wide cancellation.
It is separate from the normal worker image and never provides an inference fallback.

```sh
docker build -t zaidan-factory-worker-test:0.85.1 -f apps/factory/tests/Dockerfile apps/factory/tests
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-docker
```

Authenticated inference/refresh compatibility evidence remains in
`docs/examples/pi-eve-compatibility/EVIDENCE.md`. Normal tests make no live model calls.

## Standalone publication

Configure `IssueWorkflowOptions.publication` with `createPublicationGit`,
`createGitHubPublication`, and an idempotent reviewable-PR notification adapter.
The Git directory must be a coordinator-owned **bare** object store outside every
worker mount. Its fixed remote is a GitHub HTTPS repository; absolute local bare
remotes are supported for credential-free fixtures. Keep the GitHub token in the
coordinator configuration. Never point this adapter at a worker checkout or import
its Git configuration or hooks.

Use `workflow.admitStandalone(issueId, { startingRevision, reviewBase })` for new
standalone work. Both initial revisions must equal the observed remote `main` head.
It refreshes native discovery, readiness, the approved brief and standalone
membership. Resumption retains the original review base and refreshes authorization
again before dispatch. Standalone dependencies require the configured
`verifyPrerequisites(issue)` hook to refresh delivery evidence for that actual base;
missing verification blocks admission and publication.

After the worker phase completes, call `workflow.publishStandalone(runId)`. In live
service composition, also call this boundary for retained standalone publication
intents during restart/reconciliation. The general `scan()` API stays read-only.
The publication boundary verifies the sandbox-exported bundle hash, imports only
objects into the trusted bare store, verifies ancestry/tree, and checks that every
required command and both independent reviews cover the exact candidate and
captured admission. Git runs with isolated configuration and disabled hooks and
credential helpers; no worker-controlled code executes on the host.

`run.publication` records `reviewable`, `delivered`, `triage`, or `reconciliation`
separately from completion of the worker phase. Branch push, PR creation, notification
and issue closure have separate persistent operation intents. Recovery first reads
the remote branch and every PR state/page. A lost create response with no visible PR
pauses for reconciliation instead of issuing another create. Existing remote heads
are never overwritten without an explicit expected-head lease. The adapter refuses
to publish `main` and exposes no PR merge operation.

The PR targets `main` and contains closing keywords; the issue stays open while the
PR is open. Only an observed merge of the covered PR permits explicit completed
closure if GitHub has not already closed it. Unmerged PR closure, unusual issue
closure, changed authorization/content/membership, and reopening delivered work
require reconciliation while retaining the branch, candidate, receipts and sessions.

`factory_no_change` proposes triage when implementation is unnecessary. Its typed
`no-change` outcome records a reason without candidate evidence; a verified candidate
whose final tree equals its review base also routes to triage. Neither creates a PR
or claims delivery. Service composition routes these records to the existing triage
workflow after current tracker authorization; it must not fabricate a triage
recommendation or skip the selected skill's human checkpoint.

The normal `factory:test` suite uses real local Git repositories/SQLite with controlled
GitHub outcomes. The Docker no-change contract uses a separate network-none provider
image. Build it before `factory:test-docker`:

```sh
docker build --network none -f apps/factory/tests/Dockerfile \
  -t zaidan-factory-publication-test:0.85.1 apps/factory/tests
```

Native transport references: [GitHub pull requests REST API](https://docs.github.com/en/rest/pulls/pulls)
and [issue updates](https://docs.github.com/en/rest/issues/issues#update-an-issue).

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

### External prerequisite delivery

Configure `IssueWorkflow.externalDelivery` with `createExternalDelivery({ trustedGitDirectory,
github: createGitHubDeliverySource({ token }) })`, then call `await workflow.verifyGraph(rootId,
integration)` after a complete scan. This preserves `planGraph` as a synchronous read-only
planner; external prerequisites remain ineligible there until fresh verification is requested.

The Git directory must be a coordinator-owned **bare repository outside all worker mounts**.
Import delivery objects through the trusted integration transport before verification. The verifier
performs bounded read-only Git operations, disables replacement objects and lazy fetching, and
never runs Git from worker checkout configuration or hooks. Both `integration.reviewBase` and
`integration.head` must be full immutable commit IDs. The GitHub adapter issues only a fixed
GraphQL query using native closing references, including closed/merged PRs; arbitrary mentions
and another graph's child closure are insufficient delivery proof.

Eligibility requires one unambiguous merged closing PR whose merge commit is present in **both**
the receiving base and the worker starting head. The merge commit also proves squash delivery;
original implementation ancestry is unnecessary. Open or unmerged prerequisites wait. Unknown or
non-completion closure reasons, inaccessible/changed source, ambiguous PRs, missing objects, and
cross-repository delivery requiring an explicit mapping pause affected work for maintainer
clarification. No success is inferred from missing evidence.

Verified leaves and their admission snapshots retain `externalDeliveries`: exact prerequisite
revision, PR identity/revision and merge commit, graph/snapshot identity, receiving base, and
starting revision. Admission rejects receipts tied to different revisions. Integration must
freshly scan and verify immediately before consequential actions, preserve these receipts, and
recheck authorization and the selected head. A newer main base does not make an older graph head
eligible; the graph must first receive the delivered code. Every verification rereads delivery
source and checks Git containment, and a concurrent scan invalidates its result. No eligibility
cache survives restart or silently carries evidence across changed bases.

Protocol reference: [GitHub native closing PR references](https://docs.github.com/en/graphql/reference/issues#issue).

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
## Execution limits and recovery

`IssueWorkflow` reserves issue execution in the same transactional SQLite store as
admissions. Defaults are four executing issues and four concurrent Pi model
requests, including delegates. Model permits are independent of issue permits:
parents release their model slot before delegated tools wait. Native Pi compaction
reserves the same model capacity while its sequential summary calls run. Human, subscription,
authentication, operator waits and completed candidates awaiting integration hold
no execution slot. Unknown worker stop results retain ownership until reconciliation
confirms the entire sandbox has stopped.

Each attempt has a two-hour active wall-time budget shared across its phases and
delegates. Persisted phase start time and prior usage survive restart; overlapping
delegates do not multiply elapsed time. Time during durable human/subscription waits
is excluded. Docker completion timestamps are sealed in coordinator-owned input
receipts before container removal, so an outage after a finished checkpoint does
not count as execution. Until an orphaned active sandbox is reconciled, elapsed
time is conservatively counted. Budget expiration cancels the sandbox before releasing
capacity. A transient infrastructure outcome receives one automatic retry; failed
checks and semantic failures remain explicit failures.

Quota exhaustion produces `waiting-subscription` and one durable notification.
Authentication errors produce `waiting-authentication`; resumption requires an
explicit reauthentication signal. `resume(runId)` accepts an operator or service
availability signal and retains the original session, resource snapshot and budget.
There is no billed provider fallback. `pause`, `cancel` and explicit `retry` retain
the workspace and evidence. Explicit retry starts a fresh bounded attempt. Eve
continues durable polling for paused/failed/cancelled runs so these controls resume
the same workflow. A standalone completed candidate finishes the Eve loop; a graph
child keeps polling until integration, publication, closure and frontier admission settle.

The service owns a loopback-only model permit endpoint. Networked Docker workers
require a per-operation scoped capability in their immutable input. Pi acquires
before its provider request and releases before tool execution. An unreachable or
rejected permit terminates that Pi process before provider dispatch: Pi 0.85.1
otherwise catches extension errors and continues. Delegates use the same endpoint
with separate owners. The endpoint grants only capacity; it exposes no publication,
Telegram or model credentials. Unix socket forwarding did not work in the tested
Mac/OrbStack environment; `host.docker.internal` reaches the bound loopback port.

For embedded composition, call `startModelPermitServer(workflow, stablePort)` and
`workflow.configureModelPermits(server.url)` before driving work; close the server
on shutdown. Keep that port stable across recovery. Future integration and final
acceptance phases must use this same workflow capacity ownership, not bypass it by
calling a worker directly.

The normal test suite includes fake-clock capacity/budget/retry/recovery checks.
The additional credential-free Docker image exercises the actual native Pi hooks,
parent/delegate contention, provider quota/authentication outcomes and unavailable
permit rejection:

```sh
docker build -t zaidan-factory-worker-test-516:0.85.1 -f apps/factory/tests/Dockerfile apps/factory/tests
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-docker
```

Keep the original `zaidan-factory-worker-test:0.85.1` image for the network-disabled
containment fixtures. Neither deterministic image proves live subscription readiness.


## Serial graph integration

Configure `IssueWorkflowOptions.graph` with a `SqliteGraphStore` outside Git, the
trusted `createPublicationGit` object transport, native `createGitHubPublication`,
and the name of the existing captured integration entry skill (normally
`resolving-merge-conflicts`). Include that skill, `code-review`, and their complete
resource closure in the original admission snapshot. Configure the Docker worker's
trusted source repository to the same coordinator-owned bare object store: exported
graph commits must be available when a newly admitted leaf clones its source bundle.

`admitGraph(rootIssueId)` refreshes native discovery, records graph identity and the
observed main revision, and creates the graph branch at that commit. It introduces
no initialization commit or PR. Verified eligible leaves receive individual durable
runs and start from the published graph head containing their prerequisites. Blocked
leaves do not suppress independent work. `observeGraph` and `admittedGraphs` expose
recorded branches, heads, active integration owners, source revisions and receipts.

Normal `drive(runId)` advances a reviewed graph implementation into an explicit
integration phase. It retains the admitted issue, original resource snapshot and
session, and uses the same issue attempt and consumed active budget. Integration
inputs separately identify the child bundle, graph bundle, expected head and effective
review base. Only one integration per graph can own that phase; queued siblings hold
no execution permit. Different graphs remain eligible under the global worker and
model limits.

The integration agent works in Docker, starts from the captured graph head, merges
the child candidate, resolves conflicts, and runs all captured checks plus independent
standards/spec reviews against the assembled commit. Candidate, check and review
evidence names the exact graph identity, expected head and child commit. The trusted
coordinator imports only exported Git bundles and verifies both ancestors before a
compare-and-set graph push. It never checks out or runs project code on the host.

Publication, the shared draft PR, and explicit completed child closure have separate
durable intents and receipts. Lost replies reconcile existing branch/PR/issue state;
unknown PR creation with no visible result waits for reconciliation. Only a confirmed
published integration and an unchanged observed completed closure update prerequisite
receipts. The next eligible frontier is admitted immediately before the old Eve run
finishes. A restart after closure retries missing frontier admission without merging
or closing again. `recoverGraph(graphId)` is the explicit live-mode catch-up boundary
for persisted graph intents; ordinary `scan` and `planGraph` remain read-only.

Changed heads, membership, requirements, labels, external delivery, reopened
prerequisites, and stale validation prevent further publication. Preserved work and
explicit reconciliation reasons are available for subsequent graph re-evaluation;
these checks never fabricate a new candidate or rewrite original admission evidence.
Final whole-graph acceptance, readiness and observed main-merge finalization are later
phases. The default local service remains read-only until the full rollout gate passes.

### Pinned Eve interrupted-step recovery

The bundled `@workflow/world-local@5.0.0-beta.43` can be interrupted after creating
an empty step-creation marker but before writing the step entity and journal event.
Native startup then finds the run but cannot replay that step. The supervised host
now checks for this exact state before importing the compiled Eve server. A host PID
claim, in addition to the coordinator's exclusive service ownership, prevents repair
while a previous host is still alive.

Only an empty, unnamespaced `.created` marker for a valid active run is eligible,
and only when both its step record and corresponding journal evidence are missing.
The known world-version marker must match. Startup preserves completed runs, existing
step entities, journaled steps, and all other locks. It quarantines the orphan marker
and writes a diagnostic receipt under `.eve/factory-world-repairs`, outside the native
world directories. Unknown versions, malformed state and redirected paths fail closed.
Do not remove the world or clear its locks manually to recover a run. Revalidate this
compatibility repair when upgrading Eve or its bundled local-world runtime.

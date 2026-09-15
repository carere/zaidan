# Local software factory

Private Node application coordinated by Eve 0.54.3. Pi 0.85.1 runs in the isolated
Docker worker; it is not a website or coordinator dependency. Node 24.21.0 and
Bun 1.4.2 match the [verified compatibility gate](../../docs/examples/pi-eve-compatibility/EVIDENCE.md).

Install from the repository root with `bun install --frozen-lockfile`. Shared
compiler/lint tools and the single lockfile live at the root. This project has
its own TypeScript configuration without Solid JSX or browser globals.

`factory:tsc`, `factory:check`, and `factory:knip` are Moon checks with local-only
caches. Operational tasks must disable caching and keep state in `.factory/`,
`.eve/`, `.data/`, or `.cache/` (all ignored). Do not add Cloudflare bindings or
remote outputs to factory tasks. Coordinator configuration and operational
commands are introduced by the dependent factory tickets.

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
`workflow.recoverWake(runId)`. Bind both services to loopback. Real discovery and
operator transports are supplied by later factory tickets.

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

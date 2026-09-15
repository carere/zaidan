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

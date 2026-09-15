# Local service operations

The service runs while the maintainer's Mac is awake. It supervises one compiled
Eve host and one `IssueWorkflow` coordinator; both HTTP interfaces bind only to
`127.0.0.1`. No public inbound endpoint, Cloudflare/Vercel resource, or cloud cache
is required. Website deployment commands and configuration are unchanged.

## Prepare and run

Install the pinned dependencies from the repository root as described in the
root README. Use Node 24.21.0. Choose an external persistent state directory on a
local disk (not a Git checkout, disposable worktree, container filesystem, or
network share):

```sh
export FACTORY_STATE_DIR="$HOME/Library/Application Support/Zaidan/factory"
export FACTORY_REPOSITORY=carere/zaidan
node apps/factory/src/service-cli.ts prepare
node apps/factory/src/service-cli.ts serve
```

`prepare` copies the compiled host's source into `$FACTORY_STATE_DIR/eve`, links
the installed pinned dependencies, and builds it there. Use a stable repository
installation: the dependency link and service source must survive cleanup of
implementation worktrees. The build writes `eve/factory-build.json`; `serve` checks
its identity against the same stable source checkout, including `bun.lock`. Moving
the checkout also changes this path-bound identity. `prepare` is initial setup; it
refuses an existing `.eve` world to avoid overwriting a running deployment during recovery.

In another terminal with the same configuration:

```sh
node apps/factory/src/service-cli.ts status
node apps/factory/src/service-cli.ts scan
node apps/factory/src/service-cli.ts progress
```

Stop the foreground service with Ctrl-C; run `serve` again to restart. SIGTERM
drains the current scan (up to ten seconds), stops Eve, and releases the local
owner. If draining cannot finish, forced termination leaves durable intents for
the next restart. SIGKILL also disconnects the child supervisor's IPC channel,
causing Eve to exit rather than leaving an orphan writer. An unexpected Eve exit
terminates the coordinator so the process manager can restart the pair.

No installation or live unattended service is performed by these commands until
you explicitly run them. The shipped test uses a temporary local service only.

## Configuration and rollout

| Variable | Meaning |
| --- | --- |
| `FACTORY_STATE_DIR` | Required absolute persistent directory outside Git; symlink ancestry is checked. |
| `FACTORY_REPOSITORY` | GitHub `owner/repo`; default `carere/zaidan`. |
| `FACTORY_COORDINATOR_PORT` | Loopback coordinator port; default `4311`. |
| `FACTORY_EVE_PORT` | Distinct loopback Eve port; default `4312`. |
| `FACTORY_GITHUB_TOKEN` | Coordinator-only GitHub credential. Discovery needs read access; native live work also needs the selected repository write permissions. Never put its value in Git, logs, or a plist. |
| `FACTORY_TELEGRAM_TOKEN` | Optional selected bot token, loaded only into the coordinator environment. Requires the numeric maintainer identity below. |
| `FACTORY_TELEGRAM_MAINTAINER_ID` | Authorized positive numeric Telegram user ID; commands and answers must come from that same private chat. |
| `FACTORY_RUNTIME_CONFIG` | Absolute native runtime JSON file described below; mutually exclusive with `FACTORY_ADAPTER_MODULE`. |
| `FACTORY_ENV_FILE` | Absolute private data-only credential file; use mode `0600`, outside Git. |
| `FACTORY_ADAPTER_MODULE` | Optional absolute trusted module exporting `createServiceAdapters(context)` for explicit custom composition. |

### Native runtime and credentials

`FACTORY_RUNTIME_CONFIG` selects the production composition: native GitHub
discovery/triage/publication/delivery, the Docker Pi worker, captured resources,
serial graph integration/acceptance, and one persistent Telegram transport. Its
JSON fields are:

| Field | Value |
| --- | --- |
| `version` | `1`. |
| `mode` | `read-only`, `fixture`, or `live`; begin with disabled discovery. |
| `image` | A locally built, verified worker image reference; resolved to an immutable Docker image ID at startup. |
| `authFile` | Absolute path to the one selected native Pi `openai-codex` OAuth file. |
| `skills` | Nonempty array of `{path, selected?, target?}` source selections; capture the complete required skill/resource closure. |
| `checks` | Nonempty array of exact required worker validation commands. |
| `evidence` | Optional absolute path to the operator-owned target rollout proof below; required for enabled target live mode. |
| `faults` | Optional fixture fault points; accepted only in fixture mode. See the live fixture runbook. |

Native composition requires coordinator GitHub and Telegram credentials and the
numeric maintainer ID even for disabled discovery. It verifies the GitHub native
repository identity and `main` default branch before operation. Fixture mode is
restricted to the private `carere/zaidan-factory-fixture` repository. Choose an
explicit skill closure and check plan; the service does not discover unrelated
home resources. See [captured skills and workers](../README.md#captured-skills-and-docker-workers)
for admission snapshots and containment.

Use `FACTORY_ENV_FILE` for a private file with mode `0600` (no group/other access).
It accepts only `FACTORY_GITHUB_TOKEN`, `FACTORY_TELEGRAM_TOKEN`, and
`FACTORY_TELEGRAM_MAINTAINER_ID`, one `NAME=value` per line. Blank lines and `#`
comments are allowed; matching outer single/double quotes are removed. It is
**data, not a sourced shell script**: no `export`, interpolation or commands.
Duplicate keys, unknown keys, empty values, and conflicts with existing environment
values fail startup. Keep both this file and the selected OAuth file outside Git;
never put secret values in logs or a plist.

Launchd does not inherit terminal environment. An operator-owned wrapper may set
configuration paths and load credentials from the private file or a chosen secret
store before `exec`ing the service. Keep retrieval out of shell tracing. Eve receives
only explicit local host settings, PATH, HOME and telemetry opt-out, without
GitHub/Telegram/cloud credentials. Workers receive only the selected native OAuth
file and shared refresh lock, never coordinator tokens or the host home/Docker
socket. Reauthentication and subscription recovery are described below.

### Rollout proof and withdrawal

Default operation is **read-only discovery**. Without native configuration, missing
worker/notification adapters reject receipt lookups instead of pretending that old
operations never happened. With native configuration, disabled rollout preserves
runs and receipts while blocking consequential actions, including retained worker
starts/resumes, model permits, publication, triage writes, new checkpoint sends,
native starts and answer wakes. Receipt and owner lookups, cancellation and locally
persisting an accepted operator answer remain available. Pending effects stay pending
until authority returns; disabled rollout is not a no-I/O mode.
It does not automatically cancel already running containers: use the operator pause
or cancel controls to stop them. Factory/run pauses remain independent gates.

`status` exposes `rollout.mode`, `enabled`, `reason`, and `binding`; `progress` adds
safe run/session/snapshot identities, candidate checks/reviews, graph heads,
reconciliation decisions, image identity and fixture fault receipts. Neither
command grants authority. A scan result's `mode: "read-only"` describes discovery;
the native service's subsequent routing still requires an enabled rollout policy.

Target `live` mode is restricted to `carere/zaidan`. Complete all seven actual
scenarios in the [live fixture runbook](../../../docs/factory/live-fixture-runbook.md)
first. Controlled tests and a passing image build do not establish those outcomes.
Then perform a **fresh target discovery while rollout is disabled**, retaining its
complete snapshot and observed native repository ID. To capture the final live
configuration binding without enabling writes, select `mode: "live"` with the
intended evidence path absent; confirm `enabled: false` before triggering discovery.
Changing from `read-only` to `live` changes the configuration binding.

Only after inspecting those actual receipts and the disabled target discovery may
the operator construct the following version-1 proof at the selected evidence path.
This is a schema illustration, **not a ready-to-use proof**; every placeholder must
come from the retained observations, and `completed: true` must be justified by all
seven successful actual scenarios:

```json
{
  "version": 1,
  "binding": {
    "runtime": "<exact target status rollout.binding.runtime>",
    "configuration": "<exact target status rollout.binding.configuration>",
    "repositoryId": "<verified target GitHub node ID>"
  },
  "fixture": {
    "repository": "carere/zaidan-factory-fixture",
    "repositoryId": "<verified fixture GitHub node ID>",
    "completed": true,
    "evidenceHash": "<SHA-256 of retained actual acceptance evidence, 64 lowercase hex>",
    "scenarios": [
      "authenticated-contained-workers",
      "telegram-human-restart",
      "concurrent-conflict-graph",
      "standalone-normal-delivery",
      "external-squash-delivery",
      "graph-maintainer-delivery",
      "publication-restart"
    ]
  },
  "discovery": {
    "repository": "carere/zaidan",
    "repositoryId": "<same verified target GitHub node ID>",
    "readOnly": true,
    "snapshotHash": "<SHA-256 of retained fresh disabled discovery snapshot, 64 lowercase hex>"
  }
}
```

The runtime identity binds loaded factory `src`, `agent`, `worker`, package metadata
and the root `bun.lock`. The configuration binds mode, immutable image ID, selected
skill content/paths, checks, auth-file selection, repository and maintainer identity;
it excludes the proof file path and secret values. Absolute source paths participate
in these identities. Selected external source content is rechecked at each action;
unavailable or changed resources disable the gate. Rebuild/restart after runtime,
lockfile or image changes, obtain the resulting bindings, and revalidate evidence.

The policy rereads the proof before consequential actions. Missing, malformed,
incomplete or mismatched proof fails closed for rollout-controlled actions, also
for retained work; removing the
proof withdraws authority. The file records the operator's evidence attestation;
the schema check itself cannot establish that a human or live-provider scenario
actually happened. Do not manufacture a default proof or infer acceptance from mocks.
Placing a valid matching proof enables subsequent automatic work, so do it only as
the deliberate final rollout action. This runbook does not install or enable a live
unattended service.

### Custom adapters

`FACTORY_ADAPTER_MODULE` is the mutually exclusive trusted extension seam. Its
`createServiceAdapters({stateDirectory, repository, mode: 'read-only'})` returns the
`ServiceAdapters` contract in `src/service-adapters.ts`, including optional workflow
options, rollout policy, `onScan`, `tick`, `attach` and lifecycle hooks. Configure
resources in the factory; external effects belong to durable workflow operations.
The default fallback policy stays disabled unless an explicit policy is supplied.

`attach({workflow, service, operators})` runs once after the sole owned Eve host is
healthy and before the initial scan. Failed attachment stops startup. Connect every
callback to that same workflow and store. `onScan` receives the complete reconciled
result through the shared service trigger; `tick` participates in the owned progress
loop. Supply the native triage adapter as `triage` and `triageRecovery` to expose
uncertain action receipts. Configure Telegram through environment or custom
`adapters.telegram`, never both; the selected transport also handles checkpoints.
The owner starts its poller after reconciliation and stops it before closing state.
A custom adapter closes its own supplied Telegram instance.

## Telegram operation

The bot accepts these commands only from the configured maintainer in their private
chat. Telegram update IDs and command target lists survive restart.

| Command | Result |
| --- | --- |
| `/scan factory` | Joins the coalesced scan and native routing; routing requires the existing rollout gate. |
| `/status factory` | Shows runs, graph progress, waits, PR references and uncertain operation IDs. |
| `/status run <run-id>` | Selects one exact durable run. |
| `/pause factory` | Persists the admission/publication gate, then stops active workers and descendants. |
| `/resume factory` | Releases that gate and resumes only runs still owned by that factory pause. Manual pauses and subscription/auth waits remain explicit. |
| `/cancel factory` | Cancels captured current targets and keeps the factory gated until resume. |
| `/retry factory` | Starts one new bounded attempt for captured failed/cancelled targets; any factory pause remains. |
| `/pause run <run-id>` | Preserves this run's session, snapshot, evidence and spent budget while stopping descendants. |
| `/resume run <run-id>` | Continues the retained attempt. After local reauthentication, append `reauthenticated`. |
| `/cancel run <run-id>` | Stops descendants and retains work, sessions and evidence. |
| `/retry run <run-id>` | Explicitly starts a fresh bounded attempt for failed/cancelled work, retaining its snapshot/session and normal authorization checks. |
| `/reconcile graph <graph-id> <exact-revision> [run-id ...]` | Re-evaluates only the selected held runs against the exact observed graph decision. |

Inspect `/status factory` before a reconciliation decision. If current `main` has
advanced, the graph remains held until that base is contained in its branch. The
maintainer first brings `main` into the graph branch while preserving existing work,
then runs `/scan factory`; the factory never merges or pushes `main`. Once status
reports `receivingBase.contained: true`, explicitly adopt the exact available base:

```text
/reconcile graph <graph-id> <exact-reconciliation-revision> base=<40-hex-available-main-commit> [run-id ...]
```

Use the current revision and only the held run IDs you intend to re-evaluate. The
base-only decision may omit run IDs. Stale revisions, uncontained bases or a different
commit cannot clear the hold. Ordinary resume/retry does not approve changed scope
or receiving-base adoption; refreshed integration and whole-graph acceptance evidence
must bind the new inputs. There is no `reconcile-base` service CLI command.

Questions still use their original checkpoint buttons or reply-to message identity.
Commands do not infer a run from the most recent question. Status never includes
raw provider errors, prompts, secret environment variables or credentials. Failure
notices link to a specific retry command; subscription/auth notices explain the
required resume action. New reviewable heads notify once. Routine polls and
unchanged states stay quiet. Startup and five-second observations discover missed
terminal outcomes without starting another coordinator.

Telegram cannot query bot message history or provide a send idempotency key. An
uncertain send is retained and never automatically resent. `/retry notification
<operation-id>` gives a specific duplicate-risk warning and a confirmation command.
The configured maintainer must send that exact confirmation to authorize a resend.
`/retry triage <operation-id> <step>` uses the same protocol for an unresolved,
previously approved native GitHub action. Confirmation is bound to that operation
and step and is recorded before the override; replay cannot repeat it. A lost
confirmation outcome requires checking the remote destination and making a new
explicit choice. Triage recovery still checks original approval, current source
and the factory/run gate. Neither recovery command authorizes a new proposal.

The persistent `workflow.sqlite` owns the factory gate and per-run command receipts;
`operators.sqlite` owns command targets/responses and external-retry confirmations;
`telegram.sqlite` owns native offsets, updates and notification receipts. Back up
all three with the existing service state. Never delete them to resolve uncertainty.

## Scheduling and recovery

The coordinator checks discovery time every 30 seconds. It scans at startup and six hours
after each scan completes. A gap of more than 60 seconds between polls indicates
sleep or a stalled event loop and causes one catch-up. Multiple missed six-hour
intervals collapse into that single scan. Manual, scheduled, wake and restart
triggers during a scan join its promise; there is no pending-trigger queue. A
scan spanning sleep resets its next deadline at completion, so wake cannot add
a trailing duplicate. Explicit wake hooks can also call `trigger('wake')`. The
complete service scan includes native post-scan routing under the same coalesced promise. Routing admits
authorized triage, standalone issues and eligible graph frontiers through the sole
`IssueWorkflow`; blocked branches do not suppress independent work.

A separate, non-overlapping two-second progress tick runs only after readiness. It
recovers exhausted Eve owners, settles standalone publication and routes newly
completed triage. Eve drives implementation, serial integration and acceptance;
scans also observe external/maintainer delivery. No second coordinator, claims
database or six-hour wait is required for normal phase progress.

Before discovery, `IssueWorkflow.scan()` reconciles existing worker receipts,
engine run identities, sessions, checkpoints, notification intents and wake
intents using the original admission store. HTTP drive callbacks return a non-dispatching `running` response
until the first scan succeeds, allowing Eve to sleep without exhausting step
retries. Wake callbacks return `accepted: false` during that gate; durable wake
intents remain for reconciliation. A receipt lookup error leaves the service unready;
`status` exposes `scan-failed` without copying potentially sensitive adapter
errors. Correct the adapter/connectivity problem and run `scan`, or let the next
scheduled/wake scan retry. Never clear claims or generate a new session to hide an
uncertain receipt. Concurrent service processes targeting the same state root
are rejected by a transactional owner record even if their ports differ.

### Native continuation and interrupted creation

When native inspection confirms terminal `MAX_EVENTS_EXCEEDED`, the workflow queues
a durable successor owner. It retains the factory run, original session/resources,
worker operation, attempt and consumed budget, including during long human waits.
`eveOwnerHistory` retains retired native owner IDs and cap diagnostics. Owner-aware
drive/wake routes fence late callbacks; a lost successor-start response reconciles
that same continuation. This is typed cap recovery, not a generic semantic-failure
retry or an increased event limit.

Before the compiled host opens its world, exclusive stopped-host recovery checks
the pinned local-world creation seam. It quarantines eligible orphan step/wait
creation markers, and only narrowly eligible pending attempt-zero factory
`drive`/`recoverWake` records with no started/terminal/journal evidence. A missing
journal does not prove a step body never ran: replay safety depends on these known
idempotent coordinator operations and their retained SQLite/session state. Existing
running/completed/failed records, unknown step names and journaled state remain
untouched. Diagnostics remain in `eve/.eve/factory-world-repairs/`. Unknown versions,
malformed or redirected paths fail closed. Never clear arbitrary native locks;
revalidate this compatibility repair when upgrading Eve or its world dependency.

## State, logs and backup

| Path below `FACTORY_STATE_DIR` | Purpose |
| --- | --- |
| `workflow.sqlite` and SQLite WAL/SHM files | Authoritative admissions, original session paths, claims, checkpoints, operation intents and receipts. |
| `sessions/` | Original worker session paths allocated by the workflow. |
| `graphs.sqlite` | Serial graph integration, reconciliation, delivery and acceptance receipts. |
| `triage.sqlite` | Approved triage publication intents and per-effect receipts. |
| `telegram.sqlite`, `operators.sqlite` | Native update/send receipts, command targets and explicit recovery decisions. |
| `trusted.git/` | Coordinator-owned bare object store; never mounted in workers. |
| `resources/sources/`, `resources/snapshots/` | Captured tracked source and immutable admission resource closures. |
| `workers/runs/`, `workers/operations/`, `workers/sources/` | Retained worker workspaces, inputs/outcomes and transfer bundles. |
| `auth-locks/` | Shared native OAuth refresh locks for the selected source file. |
| `fixture-faults.json` | Persisted fixture fault receipts, when configured. |
| `service.sqlite` | Service owner PID and last scan metadata only; no issue claims. |
| `eve/.eve/.workflow-data/` | Eve's local durable runs, hooks and journals. |
| `eve/.output/`, `eve/agent/`, `eve/src/`, `eve/factory-build.json` | Compiled host, source and matching build identity. |
| `eve/.eve/factory-world-repairs/`, `eve/.eve/factory-host-owner.json` | Retained startup repair diagnostics and exclusive host ownership. |
| `logs/eve.log` | Append-only compiled host output. |
| `logs/coordinator*.log` | Coordinator event logs when using the launchd template. |

Pinned Eve 0.54.3 ignores `WORKFLOW_LOCAL_DATA_DIR`: preserve the actual deployment
working directory and `eve/.eve/.workflow-data`, not a guessed environment path.
Keep Eve's `/eve/` and `/.well-known/workflow/` routes available on loopback.

Stop the service and confirm all three listeners and the Eve process have stopped
before backing up the **whole state root**, including SQLite files and Eve world together. Restore to the same
absolute root so persisted session references remain valid. Upgrade only the
copied `eve/agent`, `eve/src`, `eve/.output` and `eve/factory-build.json` artifacts
while stopped; preserve `.eve`, databases, sessions and receipts. For a new build,
run `prepare` against a separate external staging state directory **from the same
stable source checkout that will run `serve`**, then replace all four build artifacts
in the stopped deployment. Keep compatible pinned dependencies and the existing
`node_modules` link available. Copying a manifest from a different checkout does not
repair a source-identity mismatch. Updated runtime/lockfile/image selections require
rollout evidence revalidation; an old proof must not authorize the upgraded runtime.

A dead owner PID is reclaimed transactionally on restart. If a PID was reused by
an unrelated process, recovery conservatively refuses ownership: stop all factory
processes, confirm there is no Eve writer, back up the state, and remove only
`service.sqlite` (operational owner metadata) before restart. Never remove
`workflow.sqlite` or `.eve` to repair an ownership issue. Rotate logs only while
stopped or using a method that handles open file descriptors. Task caches remain
local; operational Moon tasks use `cache: false`.

## Optional launchd lifecycle

The adjacent `dev.carere.zaidan-factory.plist` is an uninstalled template. Replace
`__NODE__` with the absolute pinned Node executable (not a shell alias),
`__REPOSITORY__` with the stable checkout, and `__STATE__` with the external state
root. XML-escape substituted paths when needed. Create its `logs` directory first.
Store the rendered file at
`~/Library/LaunchAgents/dev.carere.zaidan-factory.plist` only when ready to operate:

```sh
plutil -lint "$HOME/Library/LaunchAgents/dev.carere.zaidan-factory.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/dev.carere.zaidan-factory.plist"
launchctl print "gui/$(id -u)/dev.carere.zaidan-factory"
launchctl kickstart -k "gui/$(id -u)/dev.carere.zaidan-factory"
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/dev.carere.zaidan-factory.plist"
```

These commands respectively validate, start, inspect, restart and stop. `bootout`
is the intentional stop; killing a process while its KeepAlive job is loaded
restarts it. Do not add launchd interval jobs: the in-process schedule already
coalesces wake and restart. The login agent does not prevent the Mac sleeping.

## Focused verification

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-service
```

Fake-clock tests cover six-hour cadence, short and multi-day sleep/downtime,
overlap, restart deduplication, exclusive ownership and uncertain worker receipt
recovery. The separate service test builds actual production Eve, runs the real
CLI on temporary loopback ports with controlled discovery, forces SIGKILL,
checks orphan shutdown and persistent Eve run identity, restarts and stops with
SIGTERM. It uses no live GitHub, Telegram, model, Docker or launchd operations.

### Capacity and model permits

The service starts a dedicated model-permit listener on `127.0.0.1:4313`, reachable
from OrbStack workers through `host.docker.internal`. `FACTORY_PERMIT_PORT` changes
this port; preserve its value on restart because durable worker requests contain
that endpoint. It must differ from the coordinator and Eve ports. The listener
accepts only phase-scoped bearer requests for model acquisition/release and rejects
browser-origin requests. Do not proxy or expose it publicly.

`FACTORY_WORKERS` (default `4`), `FACTORY_MODEL_CALLS` (default `4`) and
`FACTORY_BUDGET_MS` (default `7200000`) configure positive integer limits. Worker
execution and model ownership live in `workflow.sqlite`; there is no second lease
database. An unresolved Docker cancellation keeps ownership. Restore Docker access
and reconcile the original operation; deleting a lease to unblock the pool could
permit still-running work to exceed limits.

The coordinator controls `pause(runId)`, `resume(runId)`, `cancel(runId)` and
`retry(runId)` through `IssueWorkflow`. Subscription waits resume after an explicit
service-availability/operator signal. Authentication waits require
`resume(runId, { reauthenticated: true })` after the selected login is repaired.
Repair authentication locally in the one selected native OAuth file, preserving
its shared refresh-lock contract; then send `/resume run <run-id> reauthenticated`.
Use `/resume run <run-id>` for an explicit subscription-availability signal. Both
retain the session/resources and remaining attempt budget and still require rollout
authority. Never fork renewing credential copies or delete sessions to recover.
No periodic model probe or API-billed fallback is used.

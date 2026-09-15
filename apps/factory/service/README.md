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
implementation worktrees. `prepare` is initial setup; it refuses an existing
`.eve` world to avoid overwriting a running deployment during recovery.

In another terminal with the same configuration:

```sh
node apps/factory/src/service-cli.ts status
node apps/factory/src/service-cli.ts scan
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
| `FACTORY_GITHUB_TOKEN` | Optional coordinator-only Issues-read token, supplied through a local secret loader; never put its value in Git, logs, or a plist. |
| `FACTORY_TELEGRAM_TOKEN` | Optional selected bot token, loaded only into the coordinator environment. Requires the numeric maintainer identity below. |
| `FACTORY_TELEGRAM_MAINTAINER_ID` | Authorized positive numeric Telegram user ID; commands and answers must come from that same private chat. |
| `FACTORY_ADAPTER_MODULE` | Optional absolute trusted module exporting `createServiceAdapters(context)`; connects persistent worker/notification adapters. |

Launchd does not inherit a terminal's environment. For a private repository or
authenticated discovery, use a local executable wrapper that retrieves the token
from your chosen secret store, exports `FACTORY_GITHUB_TOKEN`, then `exec`s the
service. Keep secret retrieval out of shell tracing. The shipped plist contains
no credentials. Eve receives only explicit local host settings, PATH, HOME and
telemetry opt-out; it receives no GitHub, Telegram or cloud credentials.

Default rollout is **read-only discovery**. Scans never admit new issues, mutate
GitHub, or start implementation containers. The default worker/notification
adapters throw on receipt lookups as well as operations: missing adapter
configuration cannot be mistaken for proof that an old operation never happened.
Existing admissions require their real adapters before recovery can complete.
Read-only mode still reconciles existing durable intents, including existing
engine starts, checkpoint notifications and accepted-answer wakes. It is not a
promise to abandon previously admitted work.

The adapter factory receives `{stateDirectory, repository, mode: 'read-only'}` and
returns `{worker, notifications, discovery?, triage?, telegram?, operatorGraphs?, triageRecovery?, attach?, close?}`. Implement the exported
`CreateServiceAdapters` contract in `src/service-adapters.ts`. The optional
`discovery` override is useful for controlled service fixtures; normal operation
uses native GitHub discovery. Adapter creation should only configure resources;
actual work belongs in the workflow's durable operations. Docker workers use the
maintainer's Docker/OrbStack context and outbound connections. Worker containers
are disposable; session records, skill snapshots and receipts stay under the
persistent state root. When a Telegram transport is configured, the sole service
owner starts its long poller after initial reconciliation, and stops it before
closing adapters and state. Configure Telegram through the two environment
settings or `adapters.telegram`, never both. The selected Telegram instance is
also the workflow checkpoint notification adapter. A custom adapter owns closing
its supplied Telegram instance.

`attach({workflow, service, operators})` runs once after the owned Eve host becomes
healthy and before the initial scan. Use it to connect callback closures to the
existing coordinator. Failed attachment shuts down the service; it is not retried
by health polling. The optional `operatorGraphs()` returns the exported safe
`OperatorGraphStatus` projection, including exact head, progress and PR URL. Pass
the native triage adapter as both `triage` and `triageRecovery` to expose its
unresolved step receipts. It receives the workflow action guard automatically.

For subsequent integration, `service-cli.ts` is the executable composition root:
its sole `IssueWorkflow` receives the real adapters. `LocalService.onScan` awaits
a callback with reconciled scan results and `trigger('manual' | 'wake')` is the
shared trigger for Telegram or other operator transports. Later live admission,
publication and frontier scheduling must be connected through that same workflow
policy boundary and durable store; do not create another claims database. This
release deliberately has no admission HTTP route or live-mode flag.

## Telegram operation

The bot accepts these commands only from the configured maintainer in their private
chat. Telegram update IDs and command target lists survive restart.

| Command | Result |
| --- | --- |
| `/scan factory` | Joins the existing coalesced manual scan; does not enable live admission. |
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

The coordinator checks time every 30 seconds. It scans at startup and six hours
after each scan completes. A gap of more than 60 seconds between polls indicates
sleep or a stalled event loop and causes one catch-up. Multiple missed six-hour
intervals collapse into that single scan. Manual, scheduled, wake and restart
triggers during a scan join its promise; there is no pending-trigger queue. A
scan spanning sleep resets its next deadline at completion, so wake cannot add
a trailing duplicate. Explicit wake hooks can also call `trigger('wake')`.

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

## State, logs and backup

| Path below `FACTORY_STATE_DIR` | Purpose |
| --- | --- |
| `workflow.sqlite` and SQLite WAL/SHM files | Authoritative admissions, original session paths, claims, checkpoints, operation intents and receipts. |
| `sessions/` | Original worker session paths allocated by the workflow. |
| `service.sqlite` | Service owner PID and last scan metadata only; no issue claims. |
| `eve/.eve/.workflow-data/` | Eve's local durable runs, hooks and journals. |
| `eve/.output/`, `eve/agent/`, `eve/src/` | Compiled host and copied source. |
| `logs/eve.log` | Append-only compiled host output. |
| `logs/coordinator*.log` | Coordinator event logs when using the launchd template. |

Pinned Eve 0.54.3 ignores `WORKFLOW_LOCAL_DATA_DIR`: preserve the actual deployment
working directory and `eve/.eve/.workflow-data`, not a guessed environment path.
Keep Eve's `/eve/` and `/.well-known/workflow/` routes available on loopback.

Stop the service and confirm both ports have closed before backing up the **whole
state root**, including SQLite files and Eve world together. Restore to the same
absolute root so persisted session references remain valid. Upgrade only the
copied `eve/agent`, `eve/src` and `.output` artifacts while stopped; preserve
`.eve`, databases, sessions and receipts. For a new build, run `prepare` against a
separate external staging state directory, then copy those three build artifacts
into the stopped deployment. Keep compatible pinned dependencies available.

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
No periodic model probe or API-billed fallback is used. These transport-neutral
methods are the integration points for Telegram controls.

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
returns `{worker, notifications, discovery?, close?}`. Implement the exported
`CreateServiceAdapters` contract in `src/service-adapters.ts`. The optional
`discovery` override is useful for controlled service fixtures; normal operation
uses native GitHub discovery. Adapter creation should only configure resources;
actual work belongs in the workflow's durable operations. Docker workers use the
maintainer's Docker/OrbStack context and outbound connections. Worker containers
are disposable; session records, skill snapshots and receipts stay under the
persistent state root. No worker implementation or Telegram polling is enabled
by this service ticket.

For subsequent integration, `service-cli.ts` is the executable composition root:
its sole `IssueWorkflow` receives the real adapters. `LocalService.onScan` awaits
a callback with reconciled scan results and `trigger('manual' | 'wake')` is the
shared trigger for Telegram or other operator transports. Later live admission,
publication and frontier scheduling must be connected through that same workflow
policy boundary and durable store; do not create another claims database. This
release deliberately has no admission HTTP route or live-mode flag.

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
intents using the original admission store. HTTP drive/wake callbacks return 503
until the first scan succeeds. A receipt lookup error leaves the service unready;
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

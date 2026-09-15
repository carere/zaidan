# Authenticated Pi / Eve compatibility fixture

Issue [#512](https://github.com/carere/zaidan/issues/512) gates the factory graph
[#511](https://github.com/carere/zaidan/issues/511). This workspace example keeps
runtime files, credentials, workflow state, and model writes in disposable
directories. It does not change the website or act on GitHub or Telegram.

**Observed gate: passed on 2026-09-15.** See [EVIDENCE.md](EVIDENCE.md) for the
actual checks, version pins, and limits. Startup alone never passes this gate.

## Architecture and contract

Eve compiles code-controlled workflows reached through custom HTTP routes. A
local model stub throws on every generation/stream attempt. The coordinator
starts Docker processes; Pi and its delegated reviewer execute inside Docker.
The worker uses Pi's JSONL RPC interface, checks the effective provider/model/
reasoning, invokes `/skill:compatibility-fixture`, and retains its session file.

Only `openai-codex / gpt-6-astra / high` is accepted by this fixture. The
`PI_COMPAT_PROVIDER`, `PI_COMPAT_MODEL`, and `PI_COMPAT_REASONING` environment
variables may explicitly select those values; any other selection fails before
credentials or Docker are touched. New supported combinations require their
own compatibility evidence. Pi's native reasoning setter is insufficient for
validation: the pinned version accepted an unknown level during exploration.

The fixture bridge records typed `phase.started`, `phase.completed`,
`phase.cancelled`, and `checkpoint.requested` events. A checkpoint ends the
worker turn; Eve persists a hook and releases the worker container. Answering
that hook launches a new container with the original Pi session. Completed
phase receipts keep this fixture's restart from repeating implementation or
review. This is a capability contract, not the full factory's admission,
publication, capacity, or arbitrary-crash recovery implementation.

## Deterministic checks

From the repository root, with Node 24.21.0:

```sh
node --test docs/examples/pi-eve-compatibility/preflight.test.mjs
```

These checks never run Docker or make model calls. Live checks below are
explicit opt-in commands and are outside normal website tests and Moon tasks.

## Prepare the disposable runtime

Requirements: Node 24.21.0, Bun 1.4.2, Docker on OrbStack, and a Pi ChatGPT
subscription login. The selected auth file must contain only an
`openai-codex` OAuth entry. Run Pi's interactive `/login` inside a restricted
container to create a dedicated login if an existing file contains other
credentials. Keep credentials out of source control and terminal output.

```sh
compat_repo="$(git rev-parse --show-toplevel)"
compat_workspace="$(mktemp -d)"
cp "$compat_repo/package.json" "$compat_repo/bun.lock" "$compat_workspace/"
for compat_package in apps/website apps/factory docs/examples/pi-eve-compatibility; do
  mkdir -p "$compat_workspace/$compat_package"
  cp "$compat_repo/$compat_package/package.json" "$compat_workspace/$compat_package/"
done
compat_runtime="$compat_workspace/docs/examples/pi-eve-compatibility"
cp -R "$compat_repo/docs/examples/pi-eve-compatibility"/. "$compat_runtime"/
cd "$compat_workspace"
bun install --frozen-lockfile
cd "$compat_runtime"
bun run tsc --noEmit
bun run eve build
docker build -t zaidan-pi-compat:0.85.1 .
```

The fixture shares the repository's root lockfile. The disposable workspace
retains every workspace package manifest so frozen installation resolves the same
graph, while runtime files and workflow state stay in the copied fixture. Binary
commands resolve through the workspace instead of assuming local `node_modules`.

Before modifying Eve integration, read the installed Eve package's `docs/README.md`,
`docs/guides/deployment/self-hosting.md`, `docs/tools/workflows.mdx`, and
`docs/tools/human-in-the-loop.md`. These are the source for the pinned version.

## Verify concurrent refresh before parallel authenticated work

This command intentionally exercises a real subscription credential refresh.
It acquires Pi's native lock on the selected source auth file, then starts two
non-root refresh-only Docker processes. Their native Pi stores share one lock
directory and bind the selected auth **file** directly. The source is updated
in place as Pi persists refresh results, without a copy-back gap or a mounted
host-home directory. Only the `openai-codex` credential is accepted. No API keys
or publication secrets enter the containers.

```sh
node refresh.mjs "$HOME/.pi/agent/auth.json"
```

The output must show two authenticated processes, exactly one refresh request,
and `sourcePersisted: true`. The source lock protects cooperating host Pi
sessions during the test. A lock already owned by another process fails
explicitly. Cancellation or network failure during any native OAuth refresh
can require reauthentication; never restore a copied old refresh token over a
newer persisted credential. Later factory work must preserve this shared-lock
contract instead of giving every worker a separately refreshing credential copy.

## Verify skill, delegation, and durable recovery

After the refresh check, create a fresh worker fixture. The ordinary worker
fixture refuses credentials nearing expiry so a copied token cannot rotate
independently of its source.

```sh
export COMPAT_SOURCE="$compat_runtime"
export COMPAT_FIXTURE="$(node run.mjs prepare "$HOME/.pi/agent/auth.json")"
export COMPAT_QUESTION_ID="compatibility-$(date +%s)"
PORT=3228 bun run eve start --host 127.0.0.1
```

Leave that process running. In another terminal:

```sh
curl -sS -X POST http://127.0.0.1:3228/compatibility/start
```

Retain the returned run ID and question ID. Wait for `question.persisted` in
`$COMPAT_FIXTURE/coordinator-events.jsonl`. The first worker must have written
`result.txt`, completed independent review once, and requested the question
once. Its container is removed before the durable wait.

Stop the server with Ctrl-C, then restart the same command in the first
terminal. Keep the runtime directory (including `.eve/.workflow-data`) and the
same exported environment variables. Submit an unrelated question ID first;
it must receive HTTP 400. Then submit the returned question ID and the
fixture's intended answer:

```sh
curl -sS -X POST http://127.0.0.1:3228/compatibility/answer \
  -H 'Content-Type: application/json' \
  -d '{"questionId":"THE_RETURNED_QUESTION_ID","answer":"blue"}'
curl -sS http://127.0.0.1:3228/compatibility/runs/THE_RETURNED_RUN_ID
```

The run must complete with the original Pi session ID. `answer.txt` must contain
`blue`; review/checkpoint counts must remain one. A repeated answer must fail
without another worker execution (Eve currently reports HTTP 500 for a consumed
hook; wrong IDs are rejected with HTTP 400 before reaching Eve).

## Verify cancellation

Use a separate fresh fixture to keep the completed recovery evidence intact:

```sh
compat_cancel="$(node run.mjs prepare "$HOME/.pi/agent/auth.json")"
node run.mjs worker "$compat_cancel" cancel
```

The probe waits for a delegated `sleep 120` process, sends RPC `abort`, verifies
that the parent is idle and its delegate emitted cancellation, then removes
the whole container and verifies its absence. Container removal is the final
process-tree boundary, including grandchildren created by delegated tools.

## Evidence and cleanup

`first.json`, `resume.json`, `cancel.json`, `*-containment.json`, typed event
files, and the refresh probe's `evidence.json` contain only selected metadata.
Pi session transcripts remain private inside each disposable workspace; do not
publish them or auth directories. Compare their contents against the selected
credential values in memory before publishing any new evidence.

Stop the coordinator before removing the fixture directories. The harness
removes its own worker containers after every phase. Remove only directories
and resources created for this probe. Preserve the selected source auth file:
it now holds the renewed subscription credential.

# Persistent live factory acceptance

This fixture exercises the same production service used for operation. Its runner calls only the
production CLI's `status`, `progress`, and `scan` commands. It does not call workflow admission,
drive, integration, publication, human-answer, or merge methods.

The fixed repository is the private `carere/zaidan-factory-fixture`. Preserve its existing issue #1
and historical synthetic comment. The fixture state is separate from earlier synthetic test state.
Do not delete either state directory to retry a failed step.

## Authorization and preparation

**Starting an enabled production `serve` command can immediately scan and dispatch real model
work. Obtain approval for the exact provider payload before starting it after fixture activation.**
The runner's `--approved-payload` flag is an explicit execution acknowledgement; it cannot guard a
separately started service. Until approval exists, local preparation and staged GitHub setup can
proceed independently, but keep the service stopped and avoid activation.

The proposed payload includes the full eight selected maintainer skill trees, their supporting
resources, the named private fixture's committed source and native issue/PR context, actual
maintainer checkpoint replies, tool results, and retained/delegated Pi sessions. The subscription
provider is `openai-codex`, model `gpt-6-astra`, reasoning `high`, with pinned Pi 0.85.1. Check these
actual settings and Docker boundaries during acceptance. Authentication material is never prompt
content. Earlier approval for a narrower four-skill local experiment does not authorize this payload.

From the repository root, choose durable external paths. The commands below use example paths;
replace them with the actual chosen paths. Do not paste credential values into chat or commands.

```sh
node apps/factory/tests/live-factory.ts prepare --state /absolute/factory-live-fixture
node apps/factory/tests/live-factory.ts setup --state /absolute/factory-live-fixture
```

`prepare` creates a private journal, deterministic baseline/E2 commits in a trusted bare setup
store, `setup-plan.json`, `runtime.proposed.json`, and `payload-inventory.json`. It performs no
external request or model invocation. The inventory contains source and resolved paths, every
file's byte count, executable mode, and SHA-256. Only the explicitly selected skill directories
are read. The payload hash binds those complete trees, exact fixture source/specs, checks, runtime
configuration and repository. A changed supporting file invalidates the acknowledgement before
any service command. Review the plan and config as files; a dry `setup` only prints the plan.

The default proposed runtime uses this user's selected eight home skill paths and OAuth auth-file
path. For another machine, prepare a reviewed runtime JSON first and pass
`--runtime-config /absolute/runtime.json`. It contains `version: 1`, `mode: "fixture"`, pinned worker
`image`, selected `authFile`, complete `skills` catalog, `checks`, and optional native `faults`.
Do not put GitHub/Telegram tokens in this JSON. The proposal selects one
`branch-publication.after` fault to demonstrate restart after an actual external effect.

When the user supplies the private environment file path, attach it without replacing the scenario:

```sh
node apps/factory/tests/live-factory.ts prepare --state /absolute/factory-live-fixture --credential-file /absolute/factory-fixture.env
```

The file can be attached before it exists; preparation does not read it. Actual setup/service
commands require a regular private file, mode 0600, containing the following three assignments
(with real values only in that file): `FACTORY_GITHUB_TOKEN`, `FACTORY_TELEGRAM_TOKEN`, and
`FACTORY_TELEGRAM_MAINTAINER_ID`. No shell sourcing is used. The Telegram identity must match the
sender and private chat ID; start a private bot conversation if needed. Do not run a second poller.
A conflicting credential path or changed runtime requires explicit reconciliation, not a silent
replacement of retained identities.

## Review and apply setup

After reviewing the concrete plan and authorizing fixture GitHub writes, keep the service stopped:

```sh
node apps/factory/tests/live-factory.ts setup --state /absolute/factory-live-fixture --apply
```

This stages the meaningful baseline, E2 formatter branch/PR, preserved E1 revision, six new native
issues, and native hierarchy/dependencies. New graph issues remain `ready-for-human`. E1 is also
held until activation. The setup journal retains numeric issue IDs and GraphQL node IDs separately.

Bootstrap accepts GitHub's verified empty-repository 409 response or a missing main ref. It creates
main only if absent and refuses a differing existing head. It never resets main. E2 is deliberate
human-owned scaffolding with tests, not claimed as factory implementation. Every native creation
has a deterministic scenario marker and a persisted intent. On an uncertain response, rerun the
same command: visible exact native results are recovered; an attempted but still invisible create
pauses for operator reconciliation instead of repeating it. Preserve the journal and inspect the
actual repository; never clear an intent merely to make a retry proceed.

The native relation payloads follow GitHub's current primary documentation:
[add sub-issue](https://docs.github.com/en/rest/issues/sub-issues#add-sub-issue) uses numeric
`sub_issue_id`; [add blocked-by dependency](https://docs.github.com/en/rest/issues/issue-dependencies#add-a-dependency-an-issue-is-blocked-by)
uses numeric `issue_id`. Setup reads the complete relation lists before and after writes and never
replaces an existing parent.

The topology is R → P → A/B and R → D. P is blocked by E1/E2; D is blocked by P. A/B change different
fields on the same existing source line. The actual service must retain both changes and prove a
real conflict; the fixture does not invent conflict metadata if formatting avoids one.

Only after payload/provider approval and complete setup, activate while the service is stopped:

```sh
node apps/factory/tests/live-factory.ts setup --state /absolute/factory-live-fixture --apply --activate
```

Activation sets graph children/specs ready in dependency-safe order and E1 to `needs-triage`.
E1 must undergo actual triage and real maintainer Telegram decisions. A root with no actionable
frontier waits for actual external deliveries; it must not create an old-base graph that silently
assumes later main changes are present.

## Start the production service

Build and verify the selected pinned worker image using the factory README. Set paths and ports
consistently in each terminal. The runtime proposal path below must be the reviewed path saved in
`runner-config.json`.

```sh
export FACTORY_STATE_DIR=/absolute/factory-live-fixture/service
export FACTORY_REPOSITORY=carere/zaidan-factory-fixture
export FACTORY_RUNTIME_CONFIG=/absolute/factory-live-fixture/runtime.proposed.json
export FACTORY_ENV_FILE=/absolute/factory-fixture.env
node apps/factory/src/service-cli.ts prepare
node apps/factory/src/service-cli.ts serve
```

`prepare` compiles the native Eve deployment. `serve` starts the single durable coordinator,
SQLite stores, compiled Eve world, model-permit endpoint, Docker worker and native Telegram/GitHub
adapters. The default ports are 4311/4312/4313. Retain the same environment, deployment, auth selection,
state directories, and ports across restarts. Never point the worker at a host working checkout.

In another terminal, observe and advance via the production scan path:

```sh
node apps/factory/tests/live-factory.ts status --state /absolute/factory-live-fixture
node apps/factory/tests/live-factory.ts run --state /absolute/factory-live-fixture --approved-payload REVIEWED_HASH
```

Each `run` performs one native scan and yields a persistent state. Repeat it after meaningful
progress or human action. `status` only observes and records sanitized receipts. Capture observations
while A/B execute so overlap and same starting revisions remain reviewable. Never replace a bot
answer with a scripted callback or edit SQLite to advance the run.

At E1's actual unanswered private Telegram checkpoint, save a `status` observation, stop the
foreground service with Ctrl-C, restart the same `serve` command, and observe again before replying.
Then answer the actual bot question. Confirm the same run, session, snapshot and checkpoint survive.
Triage has a recommendation decision and a later exact final apply/revise decision; neither is a
substitute for the other. Preserve the original synthetic comment unchanged.

The selected native post-publication fault deliberately kills the service once after a real GitHub
effect and before its workflow receipt. Inspect the private service log and consumed
`fixture-faults.json`, restart the same service, then rerun. A configured/consumed fault alone is not
success: compare the same candidate/publication identity, new coordinator instance, native branch,
and recovered durable receipt. Never configure an endless crash loop or clear consumed flags.

### Three maintainer merge checkpoints

| Runner state | Human action | Required native verification |
| --- | --- | --- |
| `awaiting-maintainer-normal-merge` | Normal merge of the concrete E1 PR | Merge commit has at least two parents; original candidate and merge are in main; E1 closes only after delivery. |
| `awaiting-maintainer-squash-merge` | Squash merge of the concrete E2 PR | Distinct one-parent merge commit is in main; original candidate need not be; exact prepared formatter bytes match. |
| `awaiting-maintainer-graph-merge` | Merge the exact ready graph PR | Head equals retained whole-graph acceptance; R/P remain open until native observed delivery. |

The runner saves PR identity, head/base, method scenario and observed merge evidence before yielding.
It never calls a merge endpoint. Wrong merge mode, changed PR identity/head, an unmerged closure,
or absent ancestry produces an explicit gap. Do not rewrite main to hide it. Never merge Zaidan
PR #528 as part of fixture setup or validation.

After E1/E2 delivery, A/B must start from the same current receiving head. Verify actual Docker
conflict resolution, serial publication, the first draft PR, separate child-closure receipts, and
D's prompt start from real prerequisite code. Then verify exact assembled checks, independent
Standards/Spec review, shared PR readiness and one native reviewable notification.

### Existing graphs whose receiving base is old

If an independent leaf already caused graph admission before another external prerequisite reached
main, the factory retains that original base. Observe `reconciliation.receivingBase` and its exact
`current`, `available`, and `contained` revisions. The maintainer first brings current main into the
graph branch while preserving its work, outside the factory. Then explicitly request:

```text
/reconcile graph GRAPH_ID EXACT_GRAPH_REVISION base=CURRENT_MAIN_SHA [HELD_RUN_ID ...]
```

The factory verifies containment before adopting the base. Existing snapshots, sessions and attempt
budgets remain intact. The runner never performs this merge or invents prerequisite delivery.

## Evidence and promotion

```sh
node apps/factory/tests/live-factory.ts evidence --state /absolute/factory-live-fixture
```

This writes sanitized `evidence.json`: native binding/image, hashes of the observation and merge
receipt sets, exact merge receipts, instance/restart observations, and explicit remaining gates.
It deliberately has `completed: false`; automated delivery observations alone cannot establish
provider containment, actual human interaction, conflict/delegate review, or source-compatible
promotion. Keep raw Pi sessions, Docker inspections and native effect evidence private; report
counts/categories/hashes/URLs, never tokens, auth files or checkpoint reply text.

Review all seven actual scenarios: authenticated contained workers; actual Telegram human restart;
concurrent conflict graph; standalone normal delivery; external squash delivery; graph maintainer
delivery; and post-publication restart. Deterministic loopback/Docker fixtures are a separate tier
and cannot fill actual scenario gaps. Missing approval, Telegram configuration, model execution,
human merges or live receipts means acceptance remains incomplete.

Promotion to `carere/zaidan` uses a **different target binding**. Configure the intended target live
runtime/checks/skills with a missing evidence file so its gate remains disabled. Collect actual
read-only Zaidan discovery and progress; confirm the disabled gate even for retained runs. Verify
the current factory runtime (including lockfile) matches the reviewed fixture runtime and review
compatibility of the intended target checks/resources. In the actual contained Zaidan check plan,
use a frozen install and the local locked Moon binary, keep direnv and cache disabled, bound unit
workers with `--maxWorkers=4` and browser workers with `--workers=1`, and install Chromium inside
the container. The verified image uses `NODE_OPTIONS="--dns-result-order=ipv4first --v8-pool-size=2"`
and `RAYON_NUM_THREADS=2`. A successful build exit is insufficient: verify a nonempty index and the
expected 88 prerendered HTML pages for the reviewed current source. Reassess that source-specific
count when intentional route changes alter it. Record target repository ID, target config
hash and runtime hash from native progress. Never reuse the fixture config hash as the Zaidan hash.
The operator may then construct and review the target-bound rollout proof using complete actual
scenario artifacts plus that fresh read-only discovery receipt; this runner never writes or grants
that authorization. The final promotion tool/procedure belongs to the production composition owner.

For stopped upgrades, back up all state. Refresh only compiled source/output and its build metadata
using the documented service upgrade procedure; preserve the `.eve` world, SQLite, resource snapshots,
sessions and fault receipts. A changed source/lockfile invalidates prior runtime acceptance and must
be reviewed. Do not rerun service `prepare` over an existing world as a recovery shortcut.

## Local validation tier

```sh
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-live-runner
```

These tests use temporary local Git objects, synthetic skill trees and loopback native-shaped HTTP
responses. They check uncertain setup-response recovery, all-page reads, empty GitHub repository
handling, exact native merge semantics, forbidden merge/foreign-repository writes, payload source
changes and delayed credential-path attachment. They never contact a real provider, GitHub or Telegram.

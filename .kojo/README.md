# Zaidan factory

This factory has one workflow: `implement`. A run owns one shared integration branch,
one host Git worktree, and at most one cumulative draft PR. It never merges that PR into
`main`. Per-issue branches and integration candidate branches are internal working branches.

## Prepare

The host needs Bun, Git, authenticated `gh`, Docker, Pi, and `agent-browser` with a working
browser. Pi uses the **OpenAI Codex OAuth provider and your ChatGPT subscription**; no
Anthropic provider or API key is configured. In Pi, run `/login` and choose OpenAI Codex.
The roster selects `openai-codex/gpt-5.5` for every agent.

The Docker provider mounts `~/.agents/skills` read-only and also mounts
`~/.pi/agent/skills` read-only when present. Your global skills stay live; they are not copied
into this repository. The host agents discover the same skills normally. The global
`implement`, `code-review`, `agent-browser`, and `resolving-merge-conflicts` skills must exist.
If a global skill is a symlink, its target must also be accessible in the container.

Pi's `~/.pi/agent` directory is shared read/write so parallel Pi processes use the same
OAuth refresh locks and persist renewed tokens. This also makes your Pi settings and
extensions available. Skills mounted beneath it remain read-only. Credentials are neither
copied into the factory nor included in the run's output. Every Pi invocation selects the
OpenAI Codex model explicitly, including nested review agents.

```bash
bun install --frozen-lockfile
docker build --file .kojo/sandbox/Dockerfile --tag kojo-zaidan:latest \
  --build-arg AGENT_UID=$(id -u) --build-arg AGENT_GID=$(id -g) .kojo/sandbox
bun --bun tsc --project .kojo/tsconfig.json
bun --bun biome check --config-path .kojo/biome.json .kojo
bun --bun vitest run --config .kojo/vitest.config.ts
kojo doctor
```

Commit the factory, package manifest and lockfile before running it. The issue worktrees
start from committed Git state. Register the project with the existing Kojo daemon:

```bash
kojo project register .
kojo workflow list --project <project-id>
kojo workflow start <project-id> implement --payload '{"runKey":"zaidan-batch-001","roots":[],"concurrency":3,"attempts":3,"baseBranch":"main"}'
```

Use `roots: [123]` for a solo issue or a graph rooted at issue 123. Explicit roots include
their same-repository blocker and sub-issue closure. An empty roots list discovers all
open issues carrying both `ready-for-agent` and `kojo`. Every implemented issue, including
parents and dependencies, must carry both labels. Missing metadata fails discovery rather
than being interpreted as an empty dependency list.

`runKey` is the durable idempotency key. Reuse it only to refer to the same run; a new batch
needs a new key. `concurrency` is 1–8 issue sandboxes, and `attempts` is 1–5 implementation
or integration attempts before escalation. These payload fields are required.

## Execution

1. Preflight checks tools, the Docker image, subscription login and global skills. A
   compare-and-swap Git ref claims this clone for the run, preventing overlapping implement
   runs across its worktrees. Separate independent clones are not coordinated by this lock.
2. Discovery uses GitHub's native blocker and sub-issue relationships, with pagination.
   Unblocked leaf issues get distinct Docker sandboxes from the latest shared branch.
   Parent issues become eligible after all their children close; agents verify the parent's
   acceptance criteria and combined UI behavior, implementing any remaining requirements.
3. The implementation agent executes the global `implement` skill, including its review.
   Code checkpoints the changes. Independent standards/spec reviewers and a separate UI
   agent then verify them. Code runs repository tests, lint, build and typechecking.
   The workflow owns committing, overriding the skills' default final-commit instruction.
4. One consumer integrates successful branches in the shared host worktree. It creates a
   temporary candidate branch and attempts the merge there. A Pi agent resolves conflicts
   or integration failures; independent review, UI testing and repository checks run on the
   combined candidate. Only a passing candidate advances the shared integration branch.
5. Each successful integration pushes that branch, creates or updates the same draft PR,
   then closes the issue as completed. Discovery runs again immediately, while unrelated
   workers continue. Newly unblocked work includes its dependencies from the shared branch.
6. Once there are no active workers or actionable issues, the run returns its branch, PR,
   completed issue numbers, and pending/failed work. Cycles and ineligible prerequisites
   remain open and are reported. A run with no integrated changes produces no empty PR.

“Closed” means implemented, successfully reviewed and UI-tested, and integrated into the
shared branch. It does not mean merged into the PR's base branch.

The host worktree uses Kojo's `noSandbox()` provider; issue workers use Docker. Integration
is automatic under the factory policy above. The stock `merge()` helper targets a single
run branch and a human acceptance, so this multi-branch policy is implemented in explicit
`code` phases with mechanical verification and a shared-ref compare-and-swap check.

## Exceptions and recovery

After bounded repairs fail, the coordinator drains other workers before opening a human
gate. Completed issue branches are committed and the host worktree is back on the shared
branch before suspension. Gate choices are `retry`, `skip`, and `stop`:

- `retry` starts a new attempt from the latest shared branch, supplying the earlier branch
  and findings so the implementation agent can reuse its work.
- `skip` finishes the run with failed issues still open.
- `stop` fails the run while preserving its work for inspection.

The exception loop allows three askings and expires after two days per asking. It uses
`Activity.retry`, the same engine-owned attempt counter as Kojo's `reviewed()`; the stock
helper only supports approve/reject, while this workflow needs three choices. No gate is
inside an ordinary loop. Retry never authorizes bypassing a failed check.

```bash
kojo run status <run-id> --follow
kojo gate list --project <project-id>
kojo gate answer <token> --choice retry --wait
```

Worker infrastructure errors, unexpected Git mutations, publication failures and process
crashes stop the run without closing the affected issue. Arbitrary code phases keep Kojo's
conservative unresolved recovery policy. Use Kojo's recovery/status surfaces to inspect
uncertain actions rather than starting another run and hoping they were not performed.
PR publication looks up the branch first, so an already-created PR is reused. A PR closed
or merged during an active run stops publication rather than creating another PR.

The local ownership ref is `refs/kojo/implement-owner`; normal completion releases it.
A stopped/cancelled/failed run deliberately retains it. After verifying that the owner has
no live run or workers and preserving any needed branches, an operator can inspect and
release that exact ref with Git. Never remove it while its run can still resume.

UI reports and evidence are retained through Kojo's artifact channel before a sandbox is
released. Because this runtime exposes text artifacts only, binary evidence is retained in
numbered base64 chunks; decode and concatenate them by numeric offset to reconstruct it.
Global skills, Pi settings and authentication are live host inputs; revisions retain the
factory source and prompts but do not freeze those global resources.

## Files

- `workflows/implement.ts`: trigger payload, preflight, host worktree and exception loop.
- `lib/coordinator.ts`: bounded workers, recorded completion order, discovery and run claim.
- `lib/issues.ts`: GitHub reads, eligibility and issue closure.
- `lib/worker.ts`: implementation, review and UI repair loop in each sandbox.
- `lib/integration.ts`: candidate validation, serial merge and cumulative PR publication.
- `lib/agents.ts`: Pi/Docker wiring, permissions, checks and evidence retention.
- `commands.ts`: repository commands; `kojo.config.yaml`: agent models and identities.

GitHub relationship APIs: [issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies)
and [sub-issues](https://docs.github.com/en/rest/issues/sub-issues).

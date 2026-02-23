---
model: opus
description: "Unified sync command for shadcn and external components/blocks. Routes to single or batch path based on flags."
argument-hint: "[name] [--primitive=kobalte|base] [--registry=<url>] [--docs=<url>] [--playground=<url>] [--all] [--filter=<pattern>] [--dry-run]"
---

# Purpose

Unified sync command replacing `/sync-component`, `/sync-block`, `/sync-external`, `/sync-registry`, and `/sync-all`. Routes to the appropriate workflow based on flags:

- **Name alone** -- shadcn single sync (subagent path)
- **Name + `--registry`** -- external single sync (subagent path)
- **`--all` flag** -- shadcn batch sync (Agent Teams path)
- **`--registry` without name** -- external batch sync (Agent Teams path)

Orchestrates the `zaidan-transformer` and `docs-syncer` agents, the `worktree-manager`, `git-github-ops`, and `source-resolver` skills, and generates QA user stories.

## Variables

```
ARGUMENTS: $ARGUMENTS
```

Parse from `$ARGUMENTS`:

- `NAME` -- first positional argument (optional)
- `--primitive=kobalte|base` (default: `kobalte`)
- `--registry=<url>` (optional -- external registry JSON URL)
- `--docs=<url>` (optional -- raw documentation URL)
- `--playground=<url>` (optional -- live playground URL, enables visual analysis)
- `--all` (optional -- batch sync all missing shadcn components)
- `--filter=<pattern>` (optional -- regex pattern to scope batch selection)
- `--dry-run` (optional -- report discovery results without syncing)

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # Registry manifest
    ui/                   # Component files (*.tsx)
    blocks/               # Block composition files (may not exist yet)
    examples/             # Component usage examples
src/pages/
  ui/
    <PRIMITIVE>/          # MDX documentation pages
ai_review/
  user_stories/           # YAML user stories for QA validation
.claude/
  agents/
    zaidan-transformer.md # Unified transformer agent
    docs-syncer.md        # Documentation syncing agent
  skills/
    react-to-solid/       # Transformation rules (single source of truth)
    source-resolver/      # Normalize source inputs to manifest
    worktree-manager/     # Git worktree lifecycle
    git-github-ops/       # Conventional commits, push, PR creation
```

## Instructions

- Parse `$ARGUMENTS` to extract name, flags, and options
- Route based on the combination of name and flags (4 routing paths described in Phase 0)
- Single sync uses the Task tool (subagent) to spawn agents
- Batch sync uses Agent Teams (`TeamCreate`, `TaskCreate`, `SendMessage`, `TeamDelete`)
- **IMPORTANT**: Agent Teams is experimental. Must be enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable or in `settings.json`
- Git operations (commit, push, PR) are handled at this command level, NOT by agents
- Use the `worktree-manager` skill for worktree creation
- Use the `git-github-ops` skill for git and GitHub operations
- Use the `source-resolver` skill for source resolution
- The `$APP_PORT` environment variable is available from `.env`
- The dependency pre-flight gate in the transformer is a **HARD GATE** -- if deps are missing, transformation aborts. Do NOT proceed with transformation when registry dependencies are unsatisfied

## Workflow

### Phase 0: Parse and Route

0.1 - Parse all arguments from `$ARGUMENTS`:

```
NAME         = first positional argument (no -- prefix), or empty
PRIMITIVE    = value of --primitive flag, default "kobalte"
REGISTRY_URL = value of --registry flag, or empty
DOCS_URL     = value of --docs flag, or empty
PLAYGROUND   = value of --playground flag, or empty
ALL          = true if --all flag is present
FILTER       = value of --filter flag, or empty
DRY_RUN      = true if --dry-run flag is present
```

0.2 - Determine routing path:

| Condition | Path | Mode |
|-----------|------|------|
| NAME is provided AND no `--registry` AND no `--all` | **Path 1** | Shadcn single sync (subagent) |
| NAME is provided AND `--registry` is provided | **Path 2** | External single sync (subagent) |
| `--all` is provided (no NAME required) | **Path 3** | Shadcn batch sync (Agent Teams) |
| `--registry` is provided AND no NAME | **Path 4** | External batch sync (Agent Teams) |
| None of the above match | **Abort** | Usage error |

0.3 - If no valid path matches, abort with:

```
ERROR: Invalid arguments. Usage:
  /sync <name>                                    # shadcn single component
  /sync <name> --registry=<url>                   # external single component
  /sync --all                                     # shadcn batch (all missing)
  /sync --registry=<url>                          # external batch (all missing from registry)

Optional flags: --primitive=kobalte|base --docs=<url> --playground=<url> --filter=<pattern> --dry-run
```

---

### Path 1: Shadcn Single Sync (Subagent)

Full lifecycle for syncing a single component from the shadcn GitHub repository.

#### Step 1.1: Resolve Source

Use the `source-resolver` skill to derive all URLs from the component name for shadcn GitHub:

```
Raw source:   https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/{NAME}.tsx
              (or .../blocks/{NAME}/**/*.tsx for multi-file sources)
Registry:     https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts
Raw Docs:     https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/content/docs/components/base/{NAME}.mdx
Playground:   https://ui.shadcn.com/create?item={NAME}-example
```

Produce a normalized source manifest (JSON) with `files[]`, `dependencies[]`, `registryDependencies[]`.

#### Step 1.2: Create Worktree

Use the `worktree-manager` skill to create a new git worktree:

- Branch name: `feat/sync-{NAME}`
- Worktree path: `trees/feat/sync-{NAME}`

Run `bun install` inside the worktree to ensure all dependencies are available.

#### Step 1.3: Visual Analysis (Optional)

**Only if `--playground` is provided (or PLAYGROUND is derived from shadcn URL).**

Run the Playwright three-stage pipeline on the playground URL:

- **EXPLORE**: Visit the playground URL. Systematically interact with the component -- click triggers, open menus/dialogs/popovers, type into inputs, navigate tabs, hover elements, resize viewport, use keyboard navigation (Tab, Enter, Escape, Arrow keys). Screenshot at each significant state change across 3 viewports (1280px, 768px, 375px).
- **FILTER**: From all observed interactions, keep only those revealing meaningful component behavior (open/close, data input, selection, navigation, animation, state change, responsive layout differences). Discard noise (redundant clicks, non-interactive elements, duplicate states).
- **ENCODE**: Store filtered interactions for user story generation (Step 1.9) and visual baseline screenshots for post-transformation validation (Step 1.7).

#### Step 1.4: Dependency Gate

Check all `registryDependencies` from the source manifest against `src/registry/{PRIMITIVE}/registry.json`.

**This is a HARD GATE.** If ANY registry dependency is missing:

1. Report the missing dependencies clearly
2. Provide the exact `/sync` commands to run first
3. **ABORT immediately** -- do NOT proceed to transformation

```
BLOCKED: Missing registry dependencies

The component "{NAME}" requires {N} registry dependencies.
Checked against: src/registry/{PRIMITIVE}/registry.json
{found} found, {missing_count} missing:

  Missing:
    - {dep1}
    - {dep2}

Sync the missing dependencies first (same --primitive), then retry:

  /sync {dep1} --primitive={PRIMITIVE}
  /sync {dep2} --primitive={PRIMITIVE}
  /sync {NAME} --primitive={PRIMITIVE}
```

#### Step 1.5: Spawn Transformer

Deploy the `zaidan-transformer` agent via the Task tool with the following prompt:

```
Transform this component and report results:

COMPONENT_NAME={NAME}
SOURCE_MANIFEST={source manifest JSON from Step 1.1}
PRIMITIVE={PRIMITIVE}
VISUAL_URL={PLAYGROUND if provided, otherwise omit this line}
WORKTREE_PATH={worktree absolute path}

Follow your full workflow: source resolution, dependency pre-flight,
auto-detect component vs block from file count, transform all files,
write output to the correct path, update registry, validate.
Use the specified primitive for all import mappings and output paths.

Use this exact format for your final result line:
  RESULT: {SUCCESS|FAILURE} | Component: {name} | Primitive: {primitive} | Output: {path}
```

The agent file is located at `.claude/agents/zaidan-transformer.md`.

Parse the `RESULT` line from the transformer's report.

#### Step 1.6: Spawn Docs Syncer

Deploy the `docs-syncer` agent via the Task tool with the following prompt:

```
Sync documentation and examples for the following component:

COMPONENT_NAME={NAME}
SOURCE={shadcn raw docs URL from Step 1.1}
PRIMITIVE={PRIMITIVE}
COMPONENT_TYPE={auto-detected from transformer: "component" or "block"}

Follow your full workflow: worktree guard, resolve source, fetch and transform
examples, write examples, fetch and transform documentation, write MDX
documentation, lint and format, type check. Provide the full structured report
when done.
```

The agent file is located at `.claude/agents/docs-syncer.md`.

#### Step 1.7: Visual Validation (Optional)

**Only if `--playground` was provided and the EXPLORE stage ran in Step 1.3.**

1. Start the dev server in the worktree: `bun run dev &`
2. Wait for the dev server to be ready
3. Navigate to the Zaidan version of the component
4. Replay the same interactions discovered during Step 1.3
5. Capture screenshots at the same state changes and viewports
6. Compare against the baseline screenshots from Step 1.3
7. Flag any visual regressions (layout shifts, missing elements, broken animations)
8. Stop the dev server

#### Step 1.8: Generate User Story

Read `$APP_PORT` from the `.env` file in the worktree (or use `3000` as fallback).

Generate a YAML user story file at `ai_review/user_stories/{NAME}.yaml`.

**If `--playground` was provided**: derive workflow steps from the Playwright observations (three-stage pipeline). Each filtered interaction from FILTER becomes a step (action), each observed result becomes an assertion (verification). The stories are derived from observed behavior, not templated.

**If `--playground` was NOT provided**: use the template-based generic workflow:

```yaml
stories:
  - name: "{ComponentTitle} renders correctly"
    url: "http://localhost:{APP_PORT}/ui/{NAME}"
    workflow: |
      1. Verify the page loads without console errors
      2. Verify the component preview section is visible
      3. Interact with the component's primary trigger
      4. Verify expected behavior (open/close, toggle, animation)
      5. Scroll to the Examples section
      6. Verify all example variants are rendered

  - name: "{ComponentTitle} documentation is complete"
    url: "http://localhost:{APP_PORT}/ui/{NAME}"
    workflow: |
      1. Verify the page title is "{ComponentTitle}"
      2. Verify the Installation section exists
      3. Verify the Usage section exists with code blocks
      4. Verify the Examples section lists all variants
      5. Scroll to the bottom of the page
      6. Verify no broken links or missing images
```

Replace `{ComponentTitle}` with the PascalCase title of the component (e.g., "Dialog", "Alert Dialog", "Shimmer Button").

#### Step 1.9: Ship

Use the `git-github-ops` skill to perform the following operations inside the worktree:

- Stage all changed files
- Create a conventional commit with message: `feat(ui): sync {NAME} component`
- Push the branch to the remote
- Create a pull request using `gh pr create` with:
  - Title: `feat(ui): sync {NAME} component`
  - Body summarizing: what was synced (component name, source, primitive), files created/modified, transformation notes, user story generated, link to component documentation page

#### Step 1.10: Report

Present the final summary using the **Single Sync Report Format** below.

---

### Path 2: External Single Sync (Subagent)

Full lifecycle for syncing a single component from an external (non-shadcn) source.

Same workflow as Path 1 with these differences:

#### Step 2.1: Resolve Source

Use the `source-resolver` skill with the `--registry` URL:

- If the registry JSON has a top-level `items[]` array (multi-item registry, source-resolver Format F): find the item where `item.name === NAME` and extract its files, dependencies, and registryDependencies
- If the JSON has no `items[]` array: treat the JSON itself as the component manifest (source-resolver Format C)

Produce a normalized source manifest (JSON).

#### Step 2.2: Create Worktree

Same as Path 1 Step 1.2.

#### Step 2.3: Visual Analysis (Optional)

**Only if `--playground` is provided.** Runs the same three-stage Playwright pipeline (EXPLORE, FILTER, ENCODE) on the `--playground` URL.

#### Step 2.4: Dependency Gate

Same HARD GATE as Path 1 Step 1.4. Check against `src/registry/{PRIMITIVE}/registry.json`.

#### Step 2.5: Spawn Transformer

Same as Path 1 Step 1.5, but the source manifest comes from the external registry resolution.

#### Step 2.6: Spawn Docs Syncer

Same as Path 1 Step 1.6, but pass the `--docs` URL as SOURCE if provided:

```
COMPONENT_NAME={NAME}
SOURCE={DOCS_URL if provided, otherwise omit}
PRIMITIVE={PRIMITIVE}
COMPONENT_TYPE={auto-detected from transformer}
```

#### Step 2.7: Visual Validation (Optional)

Same as Path 1 Step 1.7. Only runs if `--playground` was provided.

#### Step 2.8: Generate User Story

Same as Path 1 Step 1.8.

#### Step 2.9: Ship

Use `git-github-ops` with commit message: `feat: add {NAME} {type} from {source}`

Where `{type}` is auto-detected ("component" or "block") and `{source}` is extracted from the registry URL domain (e.g., "bazza/ui" from `https://raw.githubusercontent.com/bazzalabs/ui/...`).

Create PR with body summarizing: source registry URL, transformation results, dependency analysis, visual validation results (if `--playground`), files created/modified.

#### Step 2.10: Report

Present the final summary using the **Single Sync Report Format** below.

---

### Path 3: Shadcn Batch Sync (Agent Teams)

Discover all missing shadcn components and sync them in parallel using Agent Teams.

**IMPORTANT**: Agent Teams is experimental. Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set before proceeding.

#### Step 3.1: Discovery

Fetch the shadcn component registry:

```bash
curl -s "https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts"
```

Extract all component names from the response.

Read Zaidan's registry manifest at `src/registry/{PRIMITIVE}/registry.json`.

Diff the two registries: identify all component names present in shadcn that do NOT exist in Zaidan's registry.

If `--filter` is set, apply the regex pattern to the list of missing components. Only keep components whose names match the filter.

Report discovery results:

```
Discovery Report
================
Source: shadcn (https://ui.shadcn.com)
Primitive: {PRIMITIVE}
Filter: {FILTER or "none"}
Total components in shadcn registry: {count}
Components already in Zaidan: {count}
Components to sync: {count}

Missing components:
  - {component-name-1}
  - {component-name-2}
  - ...
```

If no components are missing, report "All shadcn components are already in Zaidan. Registry is fully synced." and STOP.

#### Step 3.2: Dry Run Gate

If `--dry-run` is set, output the discovery report and STOP:

```
Dry run complete. Re-run without --dry-run to proceed with transformation.
```

#### Step 3.3: Create Worktree

Use the `worktree-manager` skill:

- Branch name: `feat/sync-batch`
- Worktree path: `trees/feat/sync-batch`

Run `bun install` inside the worktree.

#### Step 3.4: Create Team

Use `TeamCreate` to create a team named `sync-batch`.

#### Step 3.5: Create Transform Tasks

Use `TaskCreate` to create one task per missing component:

- Subject: component name
- Description: source manifest JSON + primitive + worktree path

#### Step 3.6: Spawn Transformer Teammates

Spawn `zaidan-transformer` teammates **in a single message** (all parallel). Each teammate receives:

```
Transform this component and report results:

**Component:** {component-name}
**Primitive:** {PRIMITIVE}
**Source URLs:**
  - Registry: {shadcn registry URL}
  - Raw Source: {shadcn raw source URL}

**Worktree:** {worktree-path}

Follow your full workflow: source resolution, dependency pre-flight,
auto-detect component vs block from file count, transform all files,
write output, update registry, validate.
Use the specified primitive for all import mappings and output paths.

Use this exact format for your final result line:
  RESULT: {SUCCESS|FAILURE} | Component: {name} | Primitive: {primitive} | Output: {path}
```

Configuration per teammate:
- `subagent_type: "zaidan-transformer"`
- `team_name: "sync-batch"`

Teammates self-claim tasks from the shared list and transform independently.

#### Step 3.7: Wait for Transforms

Wait for all transformer teammates to complete. Parse `RESULT` lines from each teammate's report. Track successes and failures.

If a component fails due to missing registry dependencies, log it as blocked (not failed) and note the missing deps.

#### Step 3.8: Spawn Docs Teammates

For each successfully transformed component:

1. `TaskCreate` one docs task per component
2. Spawn `docs-syncer` teammates **in a single message** (all parallel)

Each docs teammate receives:

```
Sync documentation and examples for the following component:

COMPONENT_NAME={component-name}
PRIMITIVE={PRIMITIVE}

Follow your full workflow: worktree guard, resolve source (use default shadcn
GitHub source), fetch and transform examples, write examples, fetch and
transform documentation, write/update MDX documentation, lint and format,
type check. Generate the complete report.
```

Configuration per teammate:
- `subagent_type: "docs-syncer"`
- `team_name: "sync-batch"`

Wait for all docs teammates to complete.

#### Step 3.9: Generate User Stories

For each successfully synced component (both transform and docs), generate a template-based user story YAML at `ai_review/user_stories/{component-name}.yaml`:

```yaml
stories:
  - name: "{ComponentTitle} renders correctly"
    url: "http://localhost:{APP_PORT}/ui/{component-name}"
    workflow: |
      1. Verify the page loads without console errors
      2. Verify the component preview section is visible
      3. Interact with the component's primary trigger
      4. Verify expected behavior (open/close, toggle, animation)
      5. Scroll to the Examples section
      6. Verify all example variants are rendered

  - name: "{ComponentTitle} documentation is complete"
    url: "http://localhost:{APP_PORT}/ui/{component-name}"
    workflow: |
      1. Verify the page title is "{ComponentTitle}"
      2. Verify the Installation section exists
      3. Verify the Usage section exists with code blocks
      4. Verify the Examples section lists all variants
      5. Scroll to the bottom of the page
      6. Verify no broken links or missing images
```

#### Step 3.10: Ship

Use `git-github-ops` to:

- Stage all changes
- Create a single conventional commit: `feat: sync {N} shadcn components`
- Push the branch
- Create a PR with a summary table:

```markdown
## Summary
- Synced {N} shadcn components into Zaidan registry (primitive: {PRIMITIVE})
- Components synced: {comma-separated list}
- Components failed: {comma-separated list or "none"}
- Components blocked: {comma-separated list with missing deps or "none"}

## Components

| Component | Transform | Docs | Notes |
|-----------|-----------|------|-------|
| {name} | SUCCESS | SUCCESS | {brief note} |
| {name} | FAILURE | SKIPPED | {error summary} |
| {name} | BLOCKED | SKIPPED | Missing dep: {dep} |

## User Stories Generated
- {count} user stories written to `ai_review/user_stories/`

## Test plan
- [ ] Run `/ui-review` to validate all new components
- [ ] Verify registry.json is valid
- [ ] Check that all new component files exist in src/registry/{PRIMITIVE}/ui/
- [ ] Check that all MDX docs exist in src/pages/ui/{PRIMITIVE}/
- [ ] Check that all example files exist in src/registry/{PRIMITIVE}/examples/
```

#### Step 3.11: Cleanup

1. `SendMessage` with `type: "shutdown_request"` to all teammates
2. Wait for shutdown acknowledgments
3. `TeamDelete` to clean up the `sync-batch` team

#### Step 3.12: Report

Present the final summary using the **Batch Sync Report Format** below.

---

### Path 4: External Batch Sync (Agent Teams)

Discover all missing components from an external registry and sync them in parallel using Agent Teams.

Same workflow as Path 3 with these differences:

#### Step 4.1: Discovery

Use the `source-resolver` skill with the `--registry` URL and Format F (multi-item registry):

- Fetch the registry JSON from the `--registry` URL
- If JSON has top-level `items[]` array: extract all items
- Diff extracted items against `src/registry/{PRIMITIVE}/registry.json`
- Apply `--filter` if provided
- Report discovery results

Extract a short source name from the registry URL for branch naming (e.g., `bazza` from `https://raw.githubusercontent.com/bazzalabs/ui/...`).

#### Step 4.2: Dry Run Gate

Same as Path 3 Step 3.2.

#### Step 4.3: Create Worktree

Use the `worktree-manager` skill:

- Branch name: `feat/sync-registry-{source-name}`
- Worktree path: `trees/feat/sync-registry-{source-name}`

Run `bun install` inside the worktree.

#### Step 4.4: Create Team and Spawn Teammates

Same Agent Teams pattern as Path 3 Steps 3.4-3.6, but each teammate receives the source manifest from the external registry instead of shadcn URLs.

#### Step 4.5: Wait, Docs, User Stories

Same as Path 3 Steps 3.7-3.9.

#### Step 4.6: Ship

Use `git-github-ops` with commit message: `feat: sync {N} components from {source-name}`

PR body follows the same table format as Path 3 Step 3.10, with the registry URL noted in the summary.

#### Step 4.7: Cleanup

Same as Path 3 Step 3.11.

#### Step 4.8: Report

Present the final summary using the **Batch Sync Report Format** below.

---

## Report Formats

### Single Sync Report Format

Used by Path 1 and Path 2.

```
## Sync Report: {NAME}

**Source**: {shadcn or registry URL}
**Primitive**: {PRIMITIVE}
**Type**: {component or block} (auto-detected)

| Phase | Status | Details |
|-------|--------|---------|
| Source Resolution | PASS/FAIL | {manifest summary} |
| Dependency Gate | PASS/FAIL | {N}/{total} deps found |
| Transform | PASS/FAIL | {summary from zaidan-transformer report} |
| Documentation | PASS/FAIL | {summary from docs-syncer report} |
| Visual Validation | PASS/FAIL/SKIPPED | {comparison results or "no --playground"} |
| User Story | PASS/FAIL | ai_review/user_stories/{NAME}.yaml |
| Ship | PASS/FAIL | {commit hash, PR URL} |

### Files Created/Modified

- {list all files with absolute paths}

### Transformation Notes

- {key notes from the zaidan-transformer agent report}

### Next Steps

- Review the PR at {PR URL}
- Run `/ui-review {NAME}` to validate with bowser-qa-agent
```

If the dependency gate blocked the sync:

```
## Sync Report: {NAME}

**Status**: BLOCKED -- missing registry dependencies

| Phase | Status | Details |
|-------|--------|---------|
| Source Resolution | PASS | {manifest summary} |
| Dependency Gate | BLOCKED | {missing_count} deps missing |

### Missing Dependencies

- {dep1}
- {dep2}

### Remediation

Run these commands first, then retry:

  /sync {dep1} --primitive={PRIMITIVE}
  /sync {dep2} --primitive={PRIMITIVE}
  /sync {NAME} --primitive={PRIMITIVE} {original flags}
```

### Batch Sync Report Format

Used by Path 3 and Path 4.

```
## Batch Sync Report

**Source**: {shadcn or registry URL}
**Primitive**: {PRIMITIVE}
**Filter**: {FILTER or "none"}
**Total synced**: {success_count} / {total_count}

### Discovery Summary

| Metric | Count |
|--------|-------|
| Total in source registry | {count} |
| Already in Zaidan | {count} |
| Missing (to sync) | {count} |
| Filter applied | {yes/no} |

### Results

| Component | Transform | Docs | Notes |
|-----------|-----------|------|-------|
| {name} | SUCCESS | SUCCESS | {brief note} |
| {name} | FAILURE | SKIPPED | {error summary} |
| {name} | BLOCKED | SKIPPED | Missing dep: {dep} |

### User Stories Generated

| Component | User Story File |
|-----------|----------------|
| {name} | ai_review/user_stories/{name}.yaml |

### Git Operations

- **Branch**: {branch name}
- **Commit**: {commit message}
- **PR**: {PR URL}

### Next Steps

- Run `/ui-review` to validate all new components with bowser-qa-agent
- Review the PR for any components that need manual attention
- Check failed/blocked components and retry individually with `/sync`
```

If `--dry-run` was set, only show the Discovery Summary section and omit all other sections. End with:

```
Dry run complete. Re-run without --dry-run to proceed with transformation.
```

---
model: opus
description: "Unified sync command for shadcn and external components/blocks. Auto-detects scope from filters."
argument-hint: "[--primitive=kobalte|base] [--registry=<url>] [--docs=<template>] [--examples=<template>] [--playground=<template>] [--filter=<pattern>] [--dry-run] [--transform-instructions=<text>]"
---

# Purpose

Orchestrates the `zaidan-transformer` and `docs-syncer` agents, the `worktree-manager` and `git-github-ops` skills, and generates QA user stories to transform react shadcn-based components/blocks/registry to Zaidan. Routes between two modes: **shadcn** (default) and **external** (when `--registry` is provided).

## Variables

```
ARGUMENTS: $ARGUMENTS
```

Parse from `$ARGUMENTS`:

- `PRIMITIVE` -- `--primitive` value (default: `kobalte`)
- `REGISTRY_URL` -- `--registry` value (optional, external registry JSON URL)
- `DOCS_INPUT` -- `--docs` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `EXAMPLES_INPUT` -- `--examples` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `PLAYGROUND_INPUT` -- `--playground` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `FILTER` -- `--filter` value (optional, regex pattern)
- `DRY_RUN` -- boolean, true if `--dry-run` flag present
- `TRANSFORM_INSTRUCTIONS` -- `--transform-instructions` value (optional, free-text string passed to transformer agents)

Derived variables:

- `MODE` -- `shadcn` if no `--registry`, `external` if `--registry` is provided
- `REGISTRY_NAME` -- `shadcn` for shadcn mode, derived from URL domain for external mode
- `DOCS_URL_TEMPLATE` -- URL part of `--docs` (before `|`)
- `DOCS_PROMPT` -- prompt part of `--docs` (after `|`, or empty)
- `EXAMPLES_URL_TEMPLATE` -- URL part of `--examples` (before `|`)
- `EXAMPLES_PROMPT` -- prompt part of `--examples` (after `|`, or empty)
- `PLAYGROUND_URL_TEMPLATE` -- URL part of `--playground` (before `|`)
- `PLAYGROUND_PROMPT` -- prompt part of `--playground` (after `|`, or empty)

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # Registry manifest
    ui/                   # Component files (*.tsx)
    blocks/               # Block composition files (may not exist yet)
    examples/
      <REGISTRY>/         # Component usage examples per registry

src/pages/
  <REGISTRY>/
    <PRIMITIVE>/          # MDX documentation pages

ai_review/
  user_stories/           # YAML user stories for QA validation
  code_reviews/           # JSON code review results per component

.claude/
  agents/
    zaidan-transformer.md # Unified transformer agent
    docs-syncer.md        # Documentation syncing agent
    code-reviewer.md      # Per-component code reviewer agent
  skills/
    react-to-solid/       # Transformation rules (single source of truth)
    code-review/          # Code review rules, anti-patterns, scoring rubric
    worktree-manager/     # Git worktree lifecycle
    git-github-ops/       # Conventional commits, push, PR creation
```

## Instructions

- Parse `$ARGUMENTS` to extract flags and options
- Route based on presence of `--registry` flag (2 modes: shadcn or external)
- If `--registry` is provided and points to a shadcn URL (contains `shadcn` or `ui.shadcn.com`), abort with message: "For shadcn components, use `/sync` without `--registry`. Shadcn URLs are built-in."
- If `--registry` is provided, require `--docs`, `--examples`, and `--playground` -- abort if any is missing
- If `--registry` is NOT provided, ignore `--docs`/`--examples`/`--playground` even if passed -- use hardcoded shadcn URLs
- Always uses Agent Teams for execution, regardless of component count
- Git operations (commit, push, PR) are handled at this command level, NOT by agents
- Use the `worktree-manager` skill for worktree creation
- Use the `git-github-ops` skill for git and GitHub operations
- The `$APP_PORT` environment variable is available from `.env`
- The dependency pre-flight gate in the transformer is a **HARD GATE** -- if deps are missing, transformation aborts. Do NOT proceed with transformation when registry dependencies are unsatisfied

## Workflow

### Phase 0: Parse and Route

0.1 - Parse all arguments from `$ARGUMENTS`:

```
PRIMITIVE         = value of --primitive flag, default "kobalte"
REGISTRY_URL      = value of --registry flag, or empty
DOCS_INPUT        = value of --docs flag, or empty
EXAMPLES_INPUT    = value of --examples flag, or empty
PLAYGROUND_INPUT  = value of --playground flag, or empty
FILTER            = value of --filter flag, or empty
DRY_RUN           = true if --dry-run flag is present
TRANSFORM_INSTRUCTIONS = value of --transform-instructions flag, or empty
```

0.2 - Parse URL templates (if provided):

```
For --docs="https://example.com/docs/{component}|Look in the API section":
  DOCS_URL_TEMPLATE    = "https://example.com/docs/{component}"
  DOCS_PROMPT          = "Look in the API section"

For --examples="https://example.com/examples/{component}|Extract the example code":
  EXAMPLES_URL_TEMPLATE  = "https://example.com/examples/{component}"
  EXAMPLES_PROMPT        = "Extract the example code"

For --playground="https://example.com/{component}":
  PLAYGROUND_URL_TEMPLATE = "https://example.com/{component}"
  PLAYGROUND_PROMPT       = "" (empty, no prompt)
```

Split on `|` -- first part is URL template, second part (if present) is the extraction prompt.

0.3 - Determine mode:

**If `--registry` is provided:**

- Check if the URL contains `shadcn` or `ui.shadcn.com` -- abort with: "For shadcn components, use `/sync` without `--registry`. Shadcn URLs are built-in."
- Check `--docs` is provided -- abort with: "External registries require `--docs` flag. Provide a docs URL template with `{component}` placeholder."
- Check `--examples` is provided -- abort with: "External registries require `--examples` flag. Provide an examples URL template with `{component}` placeholder for raw example code."
- Check `--playground` is provided -- abort with: "External registries require `--playground` flag. Provide a playground URL template with `{component}` placeholder."
- `MODE = "external"`
- `REGISTRY_NAME` = derive from URL domain (e.g., `bazza` from bazzalabs URL, `magicui` from `magicui.design`)

**If `--registry` is NOT provided:**

- `MODE = "shadcn"`
- `REGISTRY_NAME = "shadcn"`
- Use hardcoded shadcn URLs:
  ```
  SOURCE_TEMPLATE     = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/{component}.tsx
  BLOCKS_TEMPLATE     = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/blocks/{component}/**/*.tsx
  REGISTRY_DISCOVERY  = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts
  DOCS_URL_TEMPLATE   = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/content/docs/components/base/{component}.mdx
  EXAMPLES_URL_TEMPLATE = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/examples/{component}-example.tsx
  PLAYGROUND_URL_TEMPLATE = https://ui.shadcn.com/create?item={component}-example
  DOCS_PROMPT         = ""
  EXAMPLES_PROMPT     = ""
  PLAYGROUND_PROMPT   = "Interact with all component triggers and interactive elements. Click buttons, open dropdowns, toggle switches. Document all animations, state changes, and visual behaviors you observe."
  ```

0.4 - If no valid mode matches, abort with:

```
ERROR: Invalid arguments. Usage:
  /sync                                              # sync all missing shadcn components
  /sync --filter=<pattern>                           # sync matching shadcn components
  /sync --registry=<url> --docs=<tpl> --examples=<tpl> --playground=<tpl>  # sync from external registry

Optional flags: --primitive=kobalte|base --filter=<pattern> --dry-run

URL templates use {component} placeholder:
  --docs="https://example.com/docs/{component}|Optional extraction prompt"
  --examples="https://example.com/examples/{component}|Optional extraction prompt"
  --playground="https://example.com/{component}|Optional interaction prompt for visual analysis"
```

---

### Phase 1: Discovery

1.1 - **Shadcn mode**: Fetch the shadcn component registry from `REGISTRY_DISCOVERY` URL, extract all component names.

1.2 - **External mode**: Fetch the `REGISTRY_URL` JSON. If it has `items[]` array, extract all item names. Otherwise, treat as single-component manifest.

1.3 - Read Zaidan's registry at `src/registry/{PRIMITIVE}/registry.json`. Diff against the source to find missing components.

1.4 - If `FILTER` is set, apply regex to the missing components list. Only keep matches.

1.5 - If no components are missing, report "Registry is fully synced" and STOP.

1.6 - Set `COMPONENTS_TO_SYNC` = the filtered list of missing component names.

1.7 - Report discovery results:

```
Discovery Report
================
Source: {REGISTRY_NAME} ({source URL or "https://ui.shadcn.com"})
Primitive: {PRIMITIVE}
Filter: {FILTER or "none"}
Total components in source registry: {count}
Components already in Zaidan: {count}
Components to sync: {count}

Missing components:
  - {component-name-1}
  - {component-name-2}
  - ...
```

---

### Phase 1.5: Dry Run Gate

If `DRY_RUN` is set, output the discovery report and STOP:

```
Dry run complete. Re-run without --dry-run to proceed with transformation.
```

---

### Phase 2: Worktree Setup

2.1 - Create worktree using `worktree-manager` skill:

- **Shadcn mode**: branch `feat/sync-shadcn`, path `trees/feat/sync-shadcn`
- **External mode**: branch `feat/sync-{REGISTRY_NAME}`, path `trees/feat/sync-{REGISTRY_NAME}`
- **If FILTER is set**, append filter to branch name: `feat/sync-shadcn-{FILTER}` or `feat/sync-{REGISTRY_NAME}-{FILTER}`
- Worktree path always matches: `trees/{branch-name}`

2.2 - `cd` into the worktree and run `bun install`.

**All the following phases should operate inside the worktree directory.** The agents will receive the worktree path as part of their input and should perform all file operations within that path.

---

### Phase 3: Registry Integration (external mode only)

**Only runs if `MODE = "external"`. All file modifications happen inside the worktree.**

3.1 - Check if `REGISTRY_NAME` exists in the zaidan codebase:

- `src/lib/registries.ts` -- is `REGISTRY_NAME` in the `REGISTRIES` array?
- `velite.config.ts` -- does a collection named `REGISTRY_NAME` exist?
- `src/lib/registry-entries.ts` -- is the new registry included in `getAllBlocks()`?

3.2 - If ALL three files already include the registry -- skip to Phase 4.

3.3 - If ANY file is missing the registry, update them:

**registries.ts** -- Add to REGISTRIES array, add REGISTRY_META entry, add to getCollectionByRegistry, and ensure the new helper functions exist:

```typescript
import { shadcn, {REGISTRY_NAME} } from "@velite";

export const REGISTRIES = ["shadcn", "{REGISTRY_NAME}"] as const;

export const EXTERNAL_REGISTRIES = REGISTRIES.filter((r) => r !== "shadcn");

export type Kind = "ui" | "blocks";

export const REGISTRY_META: Record<Registry, { label: string }> = {
  shadcn: { label: "Shadcn" },
  {REGISTRY_NAME}: { label: "{PascalCase(REGISTRY_NAME)}" },
};

export function getCollectionByRegistry(registry: Registry) {
  const collections = {
    shadcn,
    {REGISTRY_NAME},
  } satisfies Record<Registry, typeof shadcn>;
  return collections[registry];
}

export function getKindForRegistry(registry: Registry): Kind {
  return registry === "shadcn" ? "ui" : "blocks";
}

export function getRegistrySlug(componentName: string, registry: Registry): string {
  return registry === "shadcn" ? componentName : `${registry}-${componentName}`;
}

export function getDisplayName(title: string, registry: Registry): { title: string; suffix?: string } {
  return registry === "shadcn" ? { title } : { title, suffix: REGISTRY_META[registry].label };
}
```

**velite.config.ts** -- Add a new collection:

```typescript
{REGISTRY_NAME}: {
  name: "{REGISTRY_NAME}",
  pattern: "{REGISTRY_NAME}/**/*.mdx",
  schema: s.object({
    slug: s.slug("{REGISTRY_NAME}"),
    title: s.string(),
    description: s.string(),
    toc: s.toc(),
  }),
},
```

**item-picker.tsx** -- The item-picker now uses shared entries from `@/lib/registry-entries`. Ensure the new registry's items are included in `registry-entries.ts` by adding them to the `getAllBlocks()` function:

```typescript
// In src/lib/registry-entries.ts — add to getAllBlocks():
import { {REGISTRY_NAME} } from "@velite";

export function getAllBlocks(): MergedItem[] {
  return filterDrafts([
    ...tagWithRegistry(bazza, "bazza"),
    ...tagWithRegistry(motionPrimitives, "motion-primitives"),
    ...tagWithRegistry({REGISTRY_NAME}, "{REGISTRY_NAME}"),
  ]).sort((a, b) => a.title.localeCompare(b.title));
}
```

The new registry's items will appear in the "Blocks" group with route `/blocks/{-$slug}` and `kind: "blocks"`. No direct changes to `item-picker.tsx` or `item-explorer.tsx` are needed — they import from shared `registry-entries.ts`.

**item-explorer.tsx** -- Same as item-picker: uses shared entries from `@/lib/registry-entries`.

3.4 - Create the pages directory: `mkdir -p src/pages/{REGISTRY_NAME}/{PRIMITIVE}/`

3.5 - Create the examples directory: `mkdir -p src/registry/{PRIMITIVE}/examples/{REGISTRY_NAME}/`

---

### Phase 4: Execution

#### Step 4.1: Create Team

Use `TeamCreate` to create team `sync-{REGISTRY_NAME}`.

#### Step 4.2: Start Dev Server

Read `APP_PORT` from `.env` in the worktree directory (fallback to `3000` if not found).

Start the dev server in the background:

```
cd {WORKTREE_PATH} && bun run dev &
```

Store the PID of the dev server process for later cleanup.

#### Step 4.3: Wait for Dev Server Ready

Poll `http://localhost:{APP_PORT}` until it responds with a successful status code.

- Poll interval: 2 seconds
- Timeout: 60 seconds
- If timeout is reached, log a warning but continue (transforms can still run without the dev server)

Log: `Dev server ready on port {APP_PORT}`

#### Step 4.4: Create Transform Tasks and Spawn Transformer Teammates

For each component in `COMPONENTS_TO_SYNC`:

1. `TaskCreate` one task per component:
   - Subject: component name
   - Description: source manifest JSON + primitive + worktree path

2. Spawn `zaidan-transformer` teammates **in a single message** (all parallel). Each teammate receives:

```
Transform this component and report results:

**Component:** {component-name}
**Primitive:** {PRIMITIVE}
**Source URLs:**
  - Registry: {registry URL or shadcn registry URL}
  - Raw Source: {resolved source URL for this component}

**Worktree:** {worktree-path}
**Playground URL:** {resolved PLAYGROUND_URL_TEMPLATE with {component} replaced}
**Playground Prompt:** {PLAYGROUND_PROMPT or ""}
**Registry Name:** {REGISTRY_NAME}
**App Port:** {APP_PORT}
**Transform Instructions:** {TRANSFORM_INSTRUCTIONS or "none"}

Follow your full workflow: source resolution, auto-detect component vs block,
dependency pre-flight, visual analysis, user story generation, research primitives,
transform all files, write output, and validate.
Do NOT update registry.json — the sync command handles registry updates.
Include a REGISTRY_ENTRY JSON line in your report for the sync command to collect.
Use the specified primitive for all import mappings and output paths.
If Transform Instructions are provided, incorporate them as additional context during transformation.

Use this exact format for your final result line:
  RESULT: {SUCCESS|FAILURE|BLOCKED} | Component: {name} | Primitive: {primitive} | Output: {path}
```

Configuration per teammate:
- `subagent_type: "zaidan-transformer"`
- `team_name: "sync-{REGISTRY_NAME}"`

For external mode, resolve the source URL for each component by replacing `{component}` in the URL templates.

Teammates transform independently. Registry updates are handled centrally by the sync command after all transforms complete.

#### Step 4.5: Wait for Transforms

Wait for all transformer teammates to complete. Parse `RESULT` lines and `REGISTRY_ENTRY` JSON from each teammate's report.
The RESULT format from the transformer is: `RESULT: {SUCCESS|FAILURE|BLOCKED} | Component: {name} | Primitive: {primitive} | Output: {path}` (no QA field -- QA comes from the UI review phase in Step 4.9).
Track successes, failures, blocked, and collect registry entries for Step 4.6.

If a component fails due to missing registry dependencies, log it as blocked (not failed) and note the missing deps.

#### Step 4.5.5: Code Review

For each successfully transformed component, spawn a code-reviewer teammate:

1. Build the `BATCH_COMPONENTS` list: JSON array of all component names that succeeded in Step 4.5
2. Ensure the review output directory exists:
```
mkdir -p ai_review/code_reviews
```
3. Spawn `code-reviewer` teammates **in a single message** (all parallel). Each teammate receives:

```
Review the transformed component and fix any issues:

**Component:** {component-name}
**Primitive:** {PRIMITIVE}
**Output Path:** {output-path from RESULT line}
**Component Type:** {auto-detected from transformer: "component" or "block"}
**Worktree:** {worktree-path}
**Batch Components:** {JSON array of all component names in this sync}
**App Port:** {APP_PORT}

Follow your full workflow: load context, discover files, review each file,
fix FAIL files, cross-component analysis, format/lint/typecheck, persist results, and report.

Use this exact format for your final result line:
  REVIEW: {PASS|WARN|FAIL} | Component: {name} | Primitive: {primitive} | Files: {reviewed}/{total} | Issues: {count} | Fixed: {count}
```

Configuration per teammate:
- `subagent_type: "code-reviewer"`
- `team_name: "sync-{REGISTRY_NAME}"`

4. Wait for all code-reviewer teammates to complete
5. Parse `REVIEW` result lines from each teammate's report
6. Gate logic:
   - **PASS or WARN**: Component proceeds to Step 4.6 (registry updates)
   - **FAIL**: Component is excluded from registry updates. Log as review-failed with details.
7. Track review results for Phase 5 report

#### Step 4.6: Apply Registry Updates

Only process components that passed code review (PASS or WARN in Step 4.5.5).
Components that FAIL code review are excluded from registry updates.

For each successfully transformed component that passed code review, apply its registry entry sequentially:

1. Collect all `REGISTRY_ENTRY` JSON blocks from transformer reports (Step 4.5)
2. **Naming convention**: When `REGISTRY_NAME` is NOT `shadcn`, verify each entry's `"name"` field is prefixed with `<REGISTRY_NAME>-`. If the transformer did not apply the prefix, add it: `"name": "<REGISTRY_NAME>-<COMPONENT_NAME>"`. Shadcn entries MUST NOT have a registry prefix.
3. For each entry, use the `shadcn-registry` skill to add or update the entry in `src/registry/{PRIMITIVE}/registry.json`
4. Apply entries one at a time to prevent write conflicts
5. After all entries are added, build the registry:
   ```
   bun run r:build:{PRIMITIVE}
   ```
6. Lint the registry file:
   ```
   bun biome check --write src/registry/{PRIMITIVE}/registry.json
   ```

Log: `Registry updated with {N} entries, build successful`

#### Step 4.7: Create Docs Tasks and Spawn Docs Teammates

For each successfully transformed component:

1. `TaskCreate` one docs task per component
2. Spawn `docs-syncer` teammates **in a single message** (all parallel)

Each docs teammate receives:

```
Sync documentation and examples for the following component:

COMPONENT_NAME={component-name}
DOC_SOURCE={resolved DOCS_URL_TEMPLATE with {component} replaced, or empty for shadcn default}
EXAMPLE_SOURCE={resolved EXAMPLES_URL_TEMPLATE with {component} replaced, or empty for shadcn default}
PRIMITIVE={PRIMITIVE}
REGISTRY={REGISTRY_NAME}
COMPONENT_TYPE={auto-detected from transformer: "component" or "block"}
```

If DOCS_PROMPT is set, append: `\nDOCS_EXTRACTION_PROMPT={DOCS_PROMPT}`
If EXAMPLES_PROMPT is set, append: `\nEXAMPLES_EXTRACTION_PROMPT={EXAMPLES_PROMPT}`

```
Follow your full workflow: worktree guard, resolve source (use default shadcn
GitHub source if shadcn mode), fetch and transform examples, write examples,
fetch and transform documentation, write/update MDX documentation, lint and
format, type check. Generate the complete report.
```

Configuration per teammate:
- `subagent_type: "docs-syncer"`
- `team_name: "sync-{REGISTRY_NAME}"`

#### Step 4.8: Wait for Docs

Wait for all docs teammates to complete. Parse reports from each teammate.

#### Step 4.9: UI Review

For each successfully transformed component that has a user story file:

1. Verify story files exist by globbing: `ai_review/user_stories/*.yaml`
2. Filter to only include stories for components that were successfully transformed
3. Spawn one teammate per component **in a single message** (all parallel):
   - Each teammate invokes the `/ui-review` command scoped to the component's story file
   - Prompt: `/ui-review {COMPONENT_NAME}` (the component name acts as the filename-filter argument)
   - `subagent_type: "general-purpose"` (the /ui-review command handles qa spawning internally)
   - `team_name: "sync-{REGISTRY_NAME}"`
4. Wait for all ui-review teammates to complete
5. Parse results from each teammate's output (look for the UI Review Summary report)
6. Track per-component QA results: PASS, FAIL, or SKIPPED (if no story file exists)
7. Store results for inclusion in the report and PR body

#### Step 4.10: Stop Dev Server

Kill the dev server process using the stored PID from Step 4.2:

```
kill {DEV_SERVER_PID}
```

Log: `Dev server stopped (PID {DEV_SERVER_PID})`

#### Step 4.11: Verify

Run automated verification checks before shipping.

**4.11.1: Registry Validation**

Spawn a `registry-manager` teammate to audit the registry.json:

- `subagent_type: "registry-manager"`
- `team_name: "sync-{REGISTRY_NAME}"`
- Prompt: `Audit the registry at src/registry/{PRIMITIVE}/registry.json. MODE=audit PRIMITIVE={PRIMITIVE}`

Wait for completion and parse the report summary.

**4.11.2: Component File Check**

For each successfully transformed component, verify the output file exists:

- Component: `ls src/registry/{PRIMITIVE}/ui/{COMPONENT_NAME}.tsx`
- Block: `ls src/registry/{PRIMITIVE}/blocks/{COMPONENT_NAME}/`

**4.11.3: Documentation File Check**

For each component with successful docs sync, verify:

- MDX: `ls src/pages/{REGISTRY_NAME}/{PRIMITIVE}/{COMPONENT_NAME}.mdx`

**4.11.4: Example File Check**

For each component with successful docs sync, verify:

- Example: `ls src/registry/{PRIMITIVE}/examples/{REGISTRY_NAME}/{COMPONENT_NAME}-example.tsx`

Collect results: for each component, record PASS/FAIL for each check. Store verification results for inclusion in PR body and report.

#### Step 4.12: Ship

Use the `git-github-ops` skill to perform the following operations inside the worktree:

- Stage all changed files
- Create a conventional commit:
  - **Shadcn mode**: `feat: sync {component-list} from shadcn`
  - **External mode**: `feat: sync {component-list} from {REGISTRY_NAME}`
  - Where `{component-list}` is the component name if 1 component, or `{N} components` if 2+
- Push the branch to the remote
- Create a pull request using `gh pr create` with:
  - Title matching the commit message
  - Body with unified table format:

```markdown
## Summary
- Synced {component-list} from {REGISTRY_NAME} into Zaidan registry (primitive: {PRIMITIVE})
- Components synced: {comma-separated list}
- Components failed: {comma-separated list or "none"}
- Components blocked: {comma-separated list with missing deps or "none"}

## Components

| Component | Transform | Review | Docs | Visual | QA | Notes |
|-----------|-----------|--------|------|--------|-----|-------|
| {name} | SUCCESS | PASS | SUCCESS | PASS | PASS | {brief note} |
| {name} | SUCCESS | WARN | SUCCESS | PASS | PASS | 2 warnings |
| {name} | SUCCESS | FAIL | SKIPPED | SKIPPED | SKIPPED | Review failed |
| {name} | FAILURE | SKIPPED | SKIPPED | SKIPPED | SKIPPED | {error summary} |
| {name} | BLOCKED | SKIPPED | SKIPPED | SKIPPED | SKIPPED | Missing dep: {dep} |

Visual column is populated from transformer visual analysis.
Review column is populated from code review results (Step 4.5.5).
QA column is populated from UI review results (Step 4.9).

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Registry validation | PASS/FAIL | {registry-manager report summary} |
| Component files exist | PASS/FAIL | {N}/{total} files found |
| MDX docs exist | PASS/FAIL | {N}/{total} docs found |
| Example files exist | PASS/FAIL | {N}/{total} examples found |

If any verification check failed, a warning is included noting which checks failed.
```

#### Step 4.13: Cleanup

1. `SendMessage` with `type: "shutdown_request"` to all teammates
2. Wait for shutdown acknowledgments
3. `TeamDelete` to clean up the `sync-{REGISTRY_NAME}` team

---

### Phase 5: Report

Use the Report Format below.

---

## Report Format

```
## Sync Report

**Source**: {REGISTRY_NAME} ({source URL})
**Primitive**: {PRIMITIVE}
**Filter**: {FILTER or "none"}
**Total synced**: {success_count} / {total_count}

### Discovery Summary
| Metric | Count |
|--------|-------|
| Total in source registry | {count} |
| Already in Zaidan | {count} |
| Missing (to sync) | {count} |

### Results
| Component | Transform | Review | Docs | Visual | QA | Notes |
|-----------|-----------|--------|------|--------|-----|-------|
| {name} | SUCCESS | PASS | SUCCESS | PASS | PASS | {brief note} |
| {name} | SUCCESS | WARN | SUCCESS | PASS | PASS | 2 warnings |
| {name} | SUCCESS | FAIL | SKIPPED | SKIPPED | SKIPPED | Review failed |
| {name} | FAILURE | SKIPPED | SKIPPED | SKIPPED | SKIPPED | {error summary} |
| {name} | BLOCKED | SKIPPED | SKIPPED | SKIPPED | SKIPPED | Missing dep: {dep} |

### User Stories
| Component | Story File | QA Result |
|-----------|-----------|-----------|
| {name} | ai_review/user_stories/{name}.yaml | PASS/FAIL |

### Code Review
| Component | Score | Files | Issues | Fixed | Details |
|-----------|-------|-------|--------|-------|---------|
| {name} | PASS | 1/1 | 0 | 0 | Clean |
| {name} | WARN | 3/3 | 2 | 1 | Cross-component similarity with {other} |

### Verification
| Check | Status | Details |
|-------|--------|---------|
| Registry validation | PASS/FAIL | {summary} |
| Component files | PASS/FAIL | {N}/{total} |
| MDX docs | PASS/FAIL | {N}/{total} |
| Example files | PASS/FAIL | {N}/{total} |

### Git Operations
- **Branch**: {branch name}
- **Commit**: {commit message}
- **PR**: {PR URL}
```

If a component was blocked, show it in the Results table with Transform=BLOCKED and appropriate notes.

If `--dry-run` was set, only show the Discovery Summary section and omit all other sections. End with:

```
Dry run complete. Re-run without --dry-run to proceed with transformation.
```

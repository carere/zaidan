---
model: opus
description: "Sync shadcn components and blocks into Zaidan. Auto-detects ui vs block from source file count."
argument-hint: "[--primitive=kobalte|base] [--filter=<pattern>] [--dry-run] [--transform-instructions=<text>]"
---

# Purpose

Transform shadcn React components/blocks into Zaidan SolidJS equivalents.

## Variables

```
ARGUMENTS: $ARGUMENTS
```

Parse from `$ARGUMENTS`:

- `PRIMITIVE` -- `--primitive` value (default: `kobalte`)
- `FILTER` -- `--filter` value (optional, regex pattern)
- `DRY_RUN` -- boolean, true if `--dry-run` flag present
- `TRANSFORM_INSTRUCTIONS` -- `--transform-instructions` value (optional, free-text string passed to transformer agents)

Hardcoded shadcn source URLs (used by every run):

```
SOURCE_TEMPLATE         = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/{component}.tsx
BLOCKS_TEMPLATE         = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/blocks/{component}/**/*.tsx
REGISTRY_DISCOVERY      = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts
DOCS_URL_TEMPLATE       = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/content/docs/components/base/{component}.mdx
EXAMPLES_URL_TEMPLATE   = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/examples/{component}-example.tsx
PLAYGROUND_URL_TEMPLATE = https://ui.shadcn.com/create?item={component}-example
PLAYGROUND_PROMPT       = "Interact with all component triggers and interactive elements. Click buttons, open dropdowns, toggle switches. Document all animations, state changes, and visual behaviors you observe."
```

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # Registry manifest
    ui/                   # UI component files (*.tsx)
    blocks/               # Block composition directories (may not exist yet)
    examples/
      ui/                 # Examples for UI components
      blocks/             # Examples for blocks

src/pages/
  ui/<PRIMITIVE>/         # MDX docs for UI components
  blocks/<PRIMITIVE>/     # MDX docs for blocks

ai_review/
  user_stories/           # YAML user stories for QA validation
  code_reviews/           # JSON code review results per component
```

## Instructions

- Parse `$ARGUMENTS` to extract flags and options
- Always uses Agent Teams for execution, regardless of component count
- Git operations (commit, push, PR) are handled at this command level, NOT by agents
- Use the `git-github-ops` skill for git and GitHub operations
- The dependency pre-flight gate in the transformer is a **HARD GATE** -- if deps are missing, transformation aborts. Do NOT proceed with transformation when registry dependencies are unsatisfied
- The transformer auto-detects component vs block from the resolved source file count. Components write to `ui/`, blocks write to `blocks/`. Examples and MDX docs follow the same `ui/` vs `blocks/` split.

## Workflow

### Phase 0: Parse Arguments

0.1 - Parse from `$ARGUMENTS`:

```
PRIMITIVE              = value of --primitive flag, default "kobalte"
FILTER                 = value of --filter flag, or empty
DRY_RUN                = true if --dry-run flag is present
TRANSFORM_INSTRUCTIONS = value of --transform-instructions flag, or empty
```

0.2 - If invalid arguments are encountered, abort with:

```
ERROR: Invalid arguments. Usage:
  /sync                                # sync all missing shadcn components
  /sync --filter=<pattern>             # sync matching shadcn components
  /sync --dry-run                      # discovery report only, no transforms

Optional flags:
  --primitive=kobalte|base
  --transform-instructions=<text>
```

---

### Phase 1: Discovery

1.1 - Fetch the shadcn component registry from `REGISTRY_DISCOVERY`. Extract all component names.

1.2 - Read Zaidan's registry at `src/registry/{PRIMITIVE}/registry.json`. Diff against the source registry to find missing components.

1.3 - If `FILTER` is set, apply the regex to the missing components list. Only keep matches.

1.4 - If no components are missing, report "Registry is fully synced" and STOP.

1.5 - Set `COMPONENTS_TO_SYNC` = the filtered list of missing component names.

1.6 - Report discovery results:

```
Discovery Report
================
Source: shadcn (https://ui.shadcn.com)
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

### Phase 2: Execution

#### Step 2.1: Create Team

Use `TeamCreate` to create team `sync-shadcn`.

#### Step 2.2: Start Dev Server

Run the dev server `bun run dev` in the background and save the port number, you will pass it to the teammates later

#### Step 2.3: Wait for Dev Server Ready

Poll the dev server until it responds with a successful status code.

- Poll interval: 2 seconds
- Timeout: 60 seconds
- If timeout is reached, log a warning but continue (transforms can still run without the dev server)

Log: `Dev server ready on port`

#### Step 2.4: Create Transform Tasks and Spawn Transformer Teammates

For each component in `COMPONENTS_TO_SYNC`:

1. `TaskCreate` one task per component:
   - Subject: component name
   - Description: source manifest JSON + primitive

2. Spawn `zaidan-transformer` teammates **in a single message** (all parallel). Each teammate receives:

```
Transform this component and report results:

**Component:** {component-name}
**Primitive:** {PRIMITIVE}
**Source URLs:**
  - Registry: {REGISTRY_DISCOVERY}
  - Raw Source: {SOURCE_TEMPLATE with {component} replaced by component-name}
**App Port:** {APP_PORT is the port of the dev server started in Step 2.2}
**Playground URL:** {PLAYGROUND_URL_TEMPLATE with {component} replaced}
**Playground Prompt:** {PLAYGROUND_PROMPT}
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
- `team_name: "sync-shadcn"`

Teammates transform independently. Registry updates are handled centrally by the sync command after all transforms complete.

#### Step 2.5: Wait for Transforms

Wait for all transformer teammates to complete. Parse `RESULT` lines and `REGISTRY_ENTRY` JSON from each teammate's report.
The RESULT format is: `RESULT: {SUCCESS|FAILURE|BLOCKED} | Component: {name} | Primitive: {primitive} | Output: {path}`.
Track successes, failures, blocked, and collect registry entries for Step 3.7.

If a component fails due to missing registry dependencies, log it as blocked (not failed) and note the missing deps.

#### Step 2.6: Code Review

For each successfully transformed component, spawn a code-reviewer teammate:

1. Build the `BATCH_COMPONENTS` list: JSON array of all component names that succeeded in Step 2.5
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
**Batch Components:** {JSON array of all component names in this sync}
**App Port:** {APP_PORT is the port of the dev server started in Step 2.2}

Follow your full workflow: load context, discover files, review each file,
fix FAIL files, cross-component analysis, format/lint/typecheck, persist results, and report.

Use this exact format for your final result line:
  REVIEW: {PASS|WARN|FAIL} | Component: {name} | Primitive: {primitive} | Files: {reviewed}/{total} | Issues: {count} | Fixed: {count}
```

Configuration per teammate:
- `subagent_type: "code-reviewer"`
- `team_name: "sync-shadcn"`

4. Wait for all code-reviewer teammates to complete
5. Parse `REVIEW` result lines from each teammate's report
6. Gate logic:
   - **PASS or WARN**: Component proceeds to Step 3.7 (registry updates)
   - **FAIL**: Component is excluded from registry updates. Log as review-failed with details.
7. Track review results for Phase 4 report

#### Step 2.7: Apply Registry Updates

Only process components that passed code review (PASS or WARN in Step 2.6).
Components that FAIL code review are excluded from registry updates.

For each successfully transformed component that passed code review, apply its registry entry sequentially:

1. Collect all `REGISTRY_ENTRY` JSON blocks from transformer reports (Step 2.5)
2. For each entry, use the `shadcn-registry` skill to add or update the entry in `src/registry/{PRIMITIVE}/registry.json`
3. Apply entries one at a time to prevent write conflicts
4. After all entries are added, build the registry:
   ```
   bun run r:build:{PRIMITIVE}
   ```
5. Lint the registry file:
   ```
   bun biome check --write src/registry/{PRIMITIVE}/registry.json
   ```

Log: `Registry updated with {N} entries, build successful`

#### Step 2.8: Create Docs Tasks and Spawn Docs Teammates

For each successfully transformed component:

1. `TaskCreate` one docs task per component
2. Spawn `docs-syncer` teammates **in a single message** (all parallel)

Each docs teammate receives:

```
Sync documentation and examples for the following component:

COMPONENT_NAME={component-name}
PRIMITIVE={PRIMITIVE}
COMPONENT_TYPE={auto-detected from transformer: "component" or "block"}

Follow your full workflow: resolve source (uses default shadcn
GitHub source), fetch and transform examples, write examples,
fetch and transform documentation, write/update MDX documentation, lint and
format, type check. Generate the complete report.
```

Configuration per teammate:
- `subagent_type: "docs-syncer"`
- `team_name: "sync-shadcn"`

#### Step 2.9: Wait for Docs

Wait for all docs teammates to complete. Parse reports from each teammate.

#### Step 2.10: UI Review

For each successfully transformed component that has a user story file:

1. Verify story files exist by globbing: `ai_review/user_stories/*.yaml`
2. Filter to only include stories for components that were successfully transformed
3. Spawn one teammate per component **in a single message** (all parallel):
   - Each teammate invokes the `/ui-review` command scoped to the component's story file
   - Prompt: `/ui-review {COMPONENT_NAME}` (the component name acts as the filename-filter argument)
   - `subagent_type: "general-purpose"` (the /ui-review command handles qa spawning internally)
   - `team_name: "sync-shadcn"`
4. Wait for all ui-review teammates to complete
5. Parse results from each teammate's output (look for the UI Review Summary report)
6. Track per-component QA results: PASS, FAIL, or SKIPPED (if no story file exists)
7. Store results for inclusion in the report and PR body

#### Step 2.11: Stop Dev Server

Stop the background task running the dev server process you started in Step 2.2:

Log: `Dev server stopped`

#### Step 2.12: Verify

Run automated verification checks before shipping.

**2.12.1: Registry Validation**

Spawn a `registry-manager` teammate to audit the registry.json:

- `subagent_type: "registry-manager"`
- `team_name: "sync-shadcn"`
- Prompt: `Audit the registry at src/registry/{PRIMITIVE}/registry.json. MODE=audit PRIMITIVE={PRIMITIVE}`

Wait for completion and parse the report summary.

**2.12.2: Component File Check**

For each successfully transformed component, verify the output file exists:

- Component: `ls src/registry/{PRIMITIVE}/ui/{COMPONENT_NAME}.tsx`
- Block: `ls src/registry/{PRIMITIVE}/blocks/{COMPONENT_NAME}/`

**2.12.3: Documentation File Check**

For each component with successful docs sync, verify:

- Component MDX: `ls src/pages/ui/{PRIMITIVE}/{COMPONENT_NAME}.mdx`
- Block MDX: `ls src/pages/blocks/{PRIMITIVE}/{COMPONENT_NAME}.mdx`

**2.12.4: Example File Check**

For each component with successful docs sync, verify:

- Component example: `ls src/registry/{PRIMITIVE}/examples/ui/{COMPONENT_NAME}-example.tsx`
- Block example: `ls src/registry/{PRIMITIVE}/examples/blocks/{COMPONENT_NAME}-example.tsx`

Collect results: for each component, record PASS/FAIL for each check. Store verification results for inclusion in PR body and report.

#### Step 2.13: Ship

Use the `git-github-ops` skill to perform the following operations:

- Stage all changed files
- Create a conventional commit: `feat: sync {component-list} from shadcn`
  - Where `{component-list}` is the component name if 1 component, or `{N} components` if 2+
- Push the branch to the remote
- Create a pull request using `gh pr create` with:
  - Title matching the commit message
  - Body with unified table format:

```markdown
## Summary
- Synced {component-list} from shadcn into Zaidan registry (primitive: {PRIMITIVE})
- Components synced: {comma-separated list}
- Components failed: {comma-separated list or "none"}
- Components blocked: {comma-separated list with missing deps or "none"}

## Components

| Component | Kind | Transform | Review | Docs | Visual | QA | Notes |
|-----------|------|-----------|--------|------|--------|-----|-------|
| {name} | ui | SUCCESS | PASS | SUCCESS | PASS | PASS | {brief note} |
| {name} | blocks | SUCCESS | WARN | SUCCESS | PASS | PASS | 2 warnings |
| {name} | ui | SUCCESS | FAIL | SKIPPED | SKIPPED | SKIPPED | Review failed |
| {name} | ui | FAILURE | SKIPPED | SKIPPED | SKIPPED | SKIPPED | {error summary} |
| {name} | ui | BLOCKED | SKIPPED | SKIPPED | SKIPPED | SKIPPED | Missing dep: {dep} |

Visual column is populated from transformer visual analysis.
Review column is populated from code review results (Step 3.6).
QA column is populated from UI review results (Step 3.10).

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Registry validation | PASS/FAIL | {registry-manager report summary} |
| Component files exist | PASS/FAIL | {N}/{total} files found |
| MDX docs exist | PASS/FAIL | {N}/{total} docs found |
| Example files exist | PASS/FAIL | {N}/{total} examples found |

If any verification check failed, a warning is included noting which checks failed.
```

#### Step 2.14: Cleanup

1. `SendMessage` with `type: "shutdown_request"` to all teammates
2. Wait for shutdown acknowledgments
3. `TeamDelete` to clean up the `sync-shadcn` team

---

### Phase 3: Report

Use the Report Format below.

---

## Report Format

```
## Sync Report

**Source**: shadcn (https://ui.shadcn.com)
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
| Component | Kind | Transform | Review | Docs | Visual | QA | Notes |
|-----------|------|-----------|--------|------|--------|-----|-------|
| {name} | ui | SUCCESS | PASS | SUCCESS | PASS | PASS | {brief note} |
| {name} | blocks | SUCCESS | WARN | SUCCESS | PASS | PASS | 2 warnings |
| {name} | ui | SUCCESS | FAIL | SKIPPED | SKIPPED | SKIPPED | Review failed |
| {name} | ui | FAILURE | SKIPPED | SKIPPED | SKIPPED | SKIPPED | {error summary} |
| {name} | ui | BLOCKED | SKIPPED | SKIPPED | SKIPPED | SKIPPED | Missing dep: {dep} |

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

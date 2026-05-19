---
model: opus
description: "Sync shadcn or external-registry components into Zaidan. Shadcn lands under ui/blocks per auto-detection; external registries always land under blocks/."
argument-hint: "[--primitive=kobalte|base] [--registry=<url>] [--docs=<template>] [--examples=<template>] [--playground=<template>] [--filter=<pattern>] [--dry-run] [--transform-instructions=<text>]"
---

# Purpose

Transform shadcn (or external) React components/blocks into Zaidan SolidJS equivalents. Routes between two modes: **shadcn** (default) and **external** (when `--registry` is provided).

## Variables

```
ARGUMENTS: $ARGUMENTS
```

Parse from `$ARGUMENTS`:

- `PRIMITIVE` -- `--primitive` value (default: `kobalte`)
- `REGISTRY_URL` -- `--registry` value (optional, external registry index JSON URL)
- `DOCS_INPUT` -- `--docs` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `EXAMPLES_INPUT` -- `--examples` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `PLAYGROUND_INPUT` -- `--playground` value (optional, URL template with `{component}` placeholder and optional `|prompt` suffix)
- `FILTER` -- `--filter` value (optional, regex pattern)
- `DRY_RUN` -- boolean, true if `--dry-run` flag present
- `TRANSFORM_INSTRUCTIONS` -- `--transform-instructions` value (optional, free-text string passed to transformer agents)

Derived variables:

- `MODE` -- `shadcn` if no `--registry`, `external` if `--registry` is provided
- `REGISTRY_NAME` -- `shadcn` in shadcn mode; derived from the `--registry` URL host in external mode (e.g., `bazza` from `bazzalabs.com`, `magicui` from `magicui.design`). Strip TLD and any `-ui` / `-registry` suffix. Used **only** for team name, branch name, commit message, and report labels -- never prefixed onto component names or output paths.
- `DOCS_URL_TEMPLATE` / `DOCS_PROMPT` -- URL template and optional extraction prompt parsed from `--docs` (split on `|`)
- `EXAMPLES_URL_TEMPLATE` / `EXAMPLES_PROMPT` -- same for `--examples`
- `PLAYGROUND_URL_TEMPLATE` / `PLAYGROUND_PROMPT` -- same for `--playground`

Hardcoded shadcn source URLs (used in shadcn mode only):

```
SHADCN_SOURCE_TEMPLATE         = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/{component}.tsx
SHADCN_BLOCKS_TEMPLATE         = https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/blocks/{component}/**/*.tsx
SHADCN_REGISTRY_DISCOVERY      = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts
SHADCN_DOCS_URL_TEMPLATE       = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/content/docs/components/base/{component}.mdx
SHADCN_EXAMPLES_URL_TEMPLATE   = https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/examples/{component}-example.tsx
SHADCN_PLAYGROUND_URL_TEMPLATE = https://ui.shadcn.com/create?item={component}-example
SHADCN_PLAYGROUND_PROMPT       = "Interact with all component triggers and interactive elements. Click buttons, open dropdowns, toggle switches. Document all animations, state changes, and visual behaviors you observe."
```

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # Registry manifest
    ui/                   # UI component files (*.tsx) -- shadcn ui entries only
    blocks/               # Block composition directories -- shadcn blocks AND every external-registry entry
    examples/
      ui/                 # Examples for ui entries
      blocks/             # Examples for block entries (including all external)

src/pages/
  ui/<PRIMITIVE>/         # MDX docs for ui entries
  blocks/<PRIMITIVE>/     # MDX docs for block entries (including all external)

ai_review/
  user_stories/           # YAML user stories for QA validation
  code_reviews/           # JSON code review results per component
```

**External placement rule**: every external-registry entry is treated as a block regardless of its source file count. Component names are NOT prefixed with the registry name -- if you sync from registries that share base names with shadcn or with each other, the second sync will overwrite the first. Pick non-overlapping registries, or sync them into different primitives.

## Instructions

- Parse `$ARGUMENTS` to extract flags and options
- Route based on presence of `--registry` flag (2 modes: shadcn or external)
- If `--registry` is provided and points to a shadcn URL (contains `shadcn` or `ui.shadcn.com`), abort with: "For shadcn components, use `/sync` without `--registry`. Shadcn URLs are built-in."
- If `--registry` is provided, `--docs`, `--examples`, and `--playground` are all REQUIRED -- abort if any is missing
- If `--registry` is NOT provided, ignore `--docs`/`--examples`/`--playground` even if passed -- use hardcoded shadcn URLs
- Always uses Agent Teams for execution, regardless of component count
- Git operations (commit, push, PR) are handled at this command level, NOT by agents
- Use the `git-github-ops` skill for git and GitHub operations
- The dependency pre-flight gate in the transformer is a **HARD GATE** -- if deps are missing, transformation aborts. Do NOT proceed with transformation when registry dependencies are unsatisfied
- In shadcn mode, the transformer auto-detects ui vs block from source file count. In external mode, every entry is forced to `blocks/` via `KIND_OVERRIDE=block` -- the transformer skips auto-detection.

## Workflow

### Phase 0: Parse and Route

**0.1** - Parse from `$ARGUMENTS`:

```
PRIMITIVE              = value of --primitive flag, default "kobalte"
REGISTRY_URL           = value of --registry flag, or empty
DOCS_INPUT             = value of --docs flag, or empty
EXAMPLES_INPUT         = value of --examples flag, or empty
PLAYGROUND_INPUT       = value of --playground flag, or empty
FILTER                 = value of --filter flag, or empty
DRY_RUN                = true if --dry-run flag is present
TRANSFORM_INSTRUCTIONS = value of --transform-instructions flag, or empty
```

**0.2** - Parse URL templates. Split each input on `|` -- first part is the URL template, second part (if present) is the extraction/interaction prompt:

```
--docs="https://example.com/docs/{component}|Look in the API section"
  DOCS_URL_TEMPLATE       = "https://example.com/docs/{component}"
  DOCS_PROMPT             = "Look in the API section"

--examples="https://example.com/examples/{component}"
  EXAMPLES_URL_TEMPLATE   = "https://example.com/examples/{component}"
  EXAMPLES_PROMPT         = ""

--playground="https://example.com/{component}|Click every tab"
  PLAYGROUND_URL_TEMPLATE = "https://example.com/{component}"
  PLAYGROUND_PROMPT       = "Click every tab"
```

**0.3** - Determine mode:

**If `--registry` is provided (`external` mode):**

- If URL contains `shadcn` or `ui.shadcn.com`, abort: "For shadcn components, use `/sync` without `--registry`. Shadcn URLs are built-in."
- If `--docs` is missing, abort: "External registries require `--docs` flag. Provide a docs URL template with `{component}` placeholder."
- If `--examples` is missing, abort: "External registries require `--examples` flag. Provide an examples URL template with `{component}` placeholder for raw example code."
- If `--playground` is missing, abort: "External registries require `--playground` flag. Provide a playground URL template with `{component}` placeholder."
- Set `MODE = "external"`
- Derive `REGISTRY_NAME` from the `--registry` URL host (drop TLD and any `-ui` / `-registry` suffix; e.g., `bazza`, `magicui`).

**If `--registry` is NOT provided (`shadcn` mode):**

- Set `MODE = "shadcn"`
- Set `REGISTRY_NAME = "shadcn"`
- Use the hardcoded `SHADCN_*` URLs above for every per-component URL.

**0.4** - On any invalid argument shape, abort with:

```
ERROR: Invalid arguments. Usage:
  /sync                                                                     # sync all missing shadcn components
  /sync --filter=<pattern>                                                  # sync matching shadcn components
  /sync --dry-run                                                           # discovery report only, no transforms
  /sync --registry=<url> --docs=<tpl> --examples=<tpl> --playground=<tpl>   # sync from external registry

Optional flags:
  --primitive=kobalte|base
  --transform-instructions=<text>

URL templates use {component} placeholder; append `|prompt` to attach an extraction/interaction prompt:
  --docs="https://example.com/docs/{component}|Optional extraction prompt"
  --examples="https://example.com/examples/{component}|Optional extraction prompt"
  --playground="https://example.com/{component}|Optional interaction prompt for visual analysis"
```

---

### Phase 1: Discovery

**1.1** - Fetch the source registry:

- **shadcn mode**: Fetch `SHADCN_REGISTRY_DISCOVERY`. Extract all component names from the `_registry.ts` export.
- **external mode**: Fetch `REGISTRY_URL` JSON.
  - If it has `items[]`, extract every `item.name` and remember each `item.url` (the per-component manifest URL) for use in Step 2.4.
  - Otherwise, treat the document as a single-item manifest: use its top-level `name` and use `REGISTRY_URL` itself as the manifest URL for that item.

**1.2** - Read Zaidan's registry at `src/registry/{PRIMITIVE}/registry.json`. Find names from the source list that are NOT already present in Zaidan's `items[]` by `name`.

**1.3** - If `FILTER` is set, apply the regex to the missing list. Keep only matches.

**1.4** - If no components are missing, report `Registry is fully synced ({MODE})` and STOP.

**1.5** - Set `COMPONENTS_TO_SYNC`:
- shadcn mode: list of component names.
- external mode: list of `{ name, manifestUrl }` pairs.

**1.6** - Report discovery:

```
Discovery Report
================
Source: {REGISTRY_NAME} ({REGISTRY_URL or "shadcn (built-in)"})
Mode: {MODE}
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

Use `TeamCreate` to create team `sync-{REGISTRY_NAME}`.

#### Step 2.2: Start Dev Server

Run the dev server `bun run dev` in the background and save the port number; you will pass it to the teammates later.

#### Step 2.3: Wait for Dev Server Ready

Poll the dev server until it responds with a successful status code.

- Poll interval: 2 seconds
- Timeout: 60 seconds
- If timeout is reached, log a warning but continue (transforms can still run without the dev server)

Log: `Dev server ready on port {APP_PORT}`

#### Step 2.4: Create Transform Tasks and Spawn Transformer Teammates

For each component in `COMPONENTS_TO_SYNC`:

1. Resolve per-component URLs based on `MODE`:

   - **shadcn mode**:
     - `SOURCE_URL`              = `SHADCN_SOURCE_TEMPLATE` with `{component}` replaced
     - `REGISTRY_URL_FOR_AGENT`  = `SHADCN_REGISTRY_DISCOVERY`
     - `PLAYGROUND_URL`          = `SHADCN_PLAYGROUND_URL_TEMPLATE` with `{component}` replaced
     - `PLAYGROUND_PROMPT_FINAL` = `SHADCN_PLAYGROUND_PROMPT`
     - `KIND_OVERRIDE`           = empty (let transformer auto-detect from file count)

   - **external mode**:
     - `SOURCE_URL`              = `item.manifestUrl` (per-component manifest URL from Phase 1.1; transformer fetches this and reads `files[]` for raw code)
     - `REGISTRY_URL_FOR_AGENT`  = `item.manifestUrl` (same -- the per-component manifest carries the metadata, including `dependencies`, `registryDependencies`, `cssVars`)
     - `PLAYGROUND_URL`          = `PLAYGROUND_URL_TEMPLATE` with `{component}` replaced
     - `PLAYGROUND_PROMPT_FINAL` = `PLAYGROUND_PROMPT` (may be empty)
     - `KIND_OVERRIDE`           = `"block"`

2. `TaskCreate` one task per component:
   - Subject: component name
   - Description: mode + primitive + resolved URLs

3. Spawn `zaidan-transformer` teammates **in a single message** (all parallel). Each teammate receives:

```
Transform this component and report results:

**Component:** {component-name}
**Primitive:** {PRIMITIVE}
**Source URLs:**
  - Registry: {REGISTRY_URL_FOR_AGENT}
  - Raw Source: {SOURCE_URL}
**App Port:** {APP_PORT}
**Playground URL:** {PLAYGROUND_URL}
**Playground Prompt:** {PLAYGROUND_PROMPT_FINAL or "none"}
**Kind Override:** {KIND_OVERRIDE or "none"}
**Transform Instructions:** {TRANSFORM_INSTRUCTIONS or "none"}

Follow your full workflow: source resolution, kind detection (honor Kind Override if set, otherwise auto-detect from file count),
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

Teammates transform independently. Registry updates are handled centrally by the sync command after all transforms complete.

#### Step 2.5: Wait for Transforms

Wait for all transformer teammates to complete. Parse `RESULT` lines and `REGISTRY_ENTRY` JSON from each teammate's report.
The RESULT format is: `RESULT: {SUCCESS|FAILURE|BLOCKED} | Component: {name} | Primitive: {primitive} | Output: {path}`.
Track successes, failures, blocked, and collect registry entries for Step 2.7.

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
**Component Type:** {from transformer: "component" or "block"}
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
   - **PASS or WARN**: Component proceeds to Step 2.7 (registry updates)
   - **FAIL**: Component is excluded from registry updates. Log as review-failed with details.
7. Track review results for Phase 3 report

#### Step 2.7: Apply Registry Updates

Only process components that passed code review (PASS or WARN in Step 2.6). Components that FAIL are excluded.

For each component that passed code review, apply its registry entry sequentially:

1. Collect all `REGISTRY_ENTRY` JSON blocks from transformer reports (Step 2.5)
2. For each entry, use the `shadcn-registry` skill to add or update the entry in `src/registry/{PRIMITIVE}/registry.json`. **Do NOT prefix names with the registry name** -- external entries are stored under their raw name.
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

1. Resolve per-component docs sources based on `MODE`:

   - **shadcn mode**:
     - `DOC_SOURCE`     = empty (docs-syncer falls back to built-in shadcn defaults)
     - `EXAMPLE_SOURCE` = empty (docs-syncer falls back to built-in shadcn defaults)
     - `COMPONENT_TYPE` = `component` or `block` (from transformer's auto-detect)

   - **external mode**:
     - `DOC_SOURCE`     = `DOCS_URL_TEMPLATE` with `{component}` replaced; if `DOCS_PROMPT` is non-empty, append `|{DOCS_PROMPT}`
     - `EXAMPLE_SOURCE` = `EXAMPLES_URL_TEMPLATE` with `{component}` replaced; if `EXAMPLES_PROMPT` is non-empty, append `|{EXAMPLES_PROMPT}`
     - `COMPONENT_TYPE` = `block` (forced -- mirrors `KIND_OVERRIDE=block` from Step 2.4)

2. `TaskCreate` one docs task per component.

3. Spawn `docs-syncer` teammates **in a single message** (all parallel). Each teammate receives:

```
Sync documentation and examples for the following component:

COMPONENT_NAME={component-name}
PRIMITIVE={PRIMITIVE}
COMPONENT_TYPE={component or block}
DOC_SOURCE={resolved DOC_SOURCE or empty}
EXAMPLE_SOURCE={resolved EXAMPLE_SOURCE or empty}

Follow your full workflow: resolve source (uses the default shadcn GitHub source
when DOC_SOURCE/EXAMPLE_SOURCE are empty), fetch and transform examples, write
examples, fetch and transform documentation, write/update MDX documentation,
lint and format, type check. Generate the complete report.
```

Configuration per teammate:
- `subagent_type: "docs-syncer"`
- `team_name: "sync-{REGISTRY_NAME}"`

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
   - `team_name: "sync-{REGISTRY_NAME}"`
4. Wait for all ui-review teammates to complete
5. Parse results from each teammate's output (look for the UI Review Summary report)
6. Track per-component QA results: PASS, FAIL, or SKIPPED (if no story file exists)
7. Store results for inclusion in the report and PR body

#### Step 2.11: Stop Dev Server

Stop the background dev server process started in Step 2.2.

Log: `Dev server stopped`

#### Step 2.12: Verify

Run automated verification checks before shipping.

**2.12.1: Registry Validation**

Spawn a `registry-manager` teammate to audit the registry.json:

- `subagent_type: "registry-manager"`
- `team_name: "sync-{REGISTRY_NAME}"`
- Prompt: `Audit the registry at src/registry/{PRIMITIVE}/registry.json. MODE=audit PRIMITIVE={PRIMITIVE}`

Wait for completion and parse the report summary.

**2.12.2: Component File Check**

For each successfully transformed component, verify the output file/directory exists. The expected location depends on the resolved kind (auto-detected for shadcn, forced to `block` for external):

- Component (kind=`ui`):  `ls src/registry/{PRIMITIVE}/ui/{COMPONENT_NAME}.tsx`
- Block (kind=`block`):   `ls src/registry/{PRIMITIVE}/blocks/{COMPONENT_NAME}/`

**2.12.3: Documentation File Check**

For each component with successful docs sync, verify based on resolved kind:

- Component MDX: `ls src/pages/ui/{PRIMITIVE}/{COMPONENT_NAME}.mdx`
- Block MDX:     `ls src/pages/blocks/{PRIMITIVE}/{COMPONENT_NAME}.mdx`

**2.12.4: Example File Check**

For each component with successful docs sync, verify based on resolved kind:

- Component example: `ls src/registry/{PRIMITIVE}/examples/ui/{COMPONENT_NAME}-example.tsx`
- Block example:     `ls src/registry/{PRIMITIVE}/examples/blocks/{COMPONENT_NAME}-example.tsx`

Collect results: for each component, record PASS/FAIL for each check. Store verification results for inclusion in PR body and report.

#### Step 2.13: Ship

Use the `git-github-ops` skill to perform the following operations:

- Stage all changed files
- Create a conventional commit:
  - **shadcn mode**:   `feat: sync {component-list} from shadcn`
  - **external mode**: `feat: sync {component-list} from {REGISTRY_NAME}`
  - Where `{component-list}` is the component name if 1 component, or `{N} components` if 2+
- Push the branch to the remote
- Create a pull request using `gh pr create` with:
  - Title matching the commit message
  - Body with unified table format:

```markdown
## Summary
- Synced {component-list} from {REGISTRY_NAME} into Zaidan registry (primitive: {PRIMITIVE}, mode: {MODE})
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
Review column is populated from code review results (Step 2.6).
QA column is populated from UI review results (Step 2.10).

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
3. `TeamDelete` to clean up the `sync-{REGISTRY_NAME}` team

---

### Phase 3: Report

Use the Report Format below.

---

## Report Format

```
## Sync Report

**Source**: {REGISTRY_NAME} ({REGISTRY_URL or "shadcn (built-in)"})
**Mode**: {MODE}
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

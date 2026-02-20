# Proposed Agentic System: Zaidan Forge

An agentic system following Bowser's four-layer architecture, purpose-built for Zaidan's component registry lifecycle.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  REUSABILITY                                                             │
│  just sync-component accordion  |  just sync-block login-01              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ORCHESTRATE                                  /commands            │  │
│  │  /sync-component, /sync-block, /registry-update, /sync-all         │  │
│  │                                                                    │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐                 │  │
│  │  │ transformer │ │ transformer │ │ bowser-qa     │  ...            │  │
│  │  │ (accordion) │ │ (dialog)    │ │ (user stories)│                 │  │
│  │  └──────┬──────┘ └──────┬──────┘ └───────┬───────┘                 │  │
│  │         │               │                │                         │  │
│  │  ┌──────▼───────────────▼────────────────▼──────────────────────┐  │  │
│  │  │  SCALE                                    subagents          │  │  │
│  │  │  component-transformer  |  block-transformer                 │  │  │
│  │  │  docs-syncer  |  registry-manager  |  bowser-qa-agent (ext.) │  │  │
│  │  │                                                              │  │  │
│  │  │  ┌───────────────────────────────────────────────────────┐   │  │  │
│  │  │  │  CAPABILITY                          skills           │   │  │  │
│  │  │  │  react-to-solid  |  worktree-manager (ext.)           │   │  │  │
│  │  │  │  git-github-ops (ext.)  |  shadcn-registry (ext.)     │   │  │  │
│  │  │  └───────────────────────────────────────────────────────┘   │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Skills (Capability)

These are the atomic capabilities that agents compose.

| Skill | Purpose | Location |
|-------|---------|----------|
| **`react-to-solid`** | Core transformation engine. Contains the React-to-SolidJS mapping tables (className to class, splitProps, mergeProps, Show/For, etc.) AND the Base UI to Kobalte/Corvu mapping tables. Provides transformation rules as reusable context — no workflow, just knowledge. | `.claude/skills/react-to-solid/SKILL.md` |
| **`worktree-manager`** | (Already exists) Create, enter, list, and clean up git worktrees under `trees/`. Handles `git worktree add`, branch naming conventions (`feat/sync-<name>`, `feat/block-<name>`), `bun install` inside the worktree, and cleanup. | `.claude/skills/worktree-manager/SKILL.md` |
| **`shadcn-registry`** | (Already exists) Manage `registry.json` — add/update/remove items, validate schema against `https://ui.shadcn.com/schema/registry.json`, handle dependency resolution (`@kobalte/core`, `@corvu/*`, `cva`, `lucide-solid`), and registryDependencies cross-references. | `.claude/skills/shadcn-registry/SKILL.md` |
| **`git-github-ops`** | (Already exists) Conventional commits, push, PR creation with proper descriptions. Enforced by lefthook + commitlint. | `.claude/skills/git-github-ops/SKILL.md` |

**Key change from existing agents**: The React-to-SolidJS transformation tables and the Base UI-to-Kobalte mapping are extracted into a shared skill instead of being duplicated across two agents. This is the single source of truth.

---

## Layer 2 — Subagents (Scale)

Isolated, parallelizable workers that compose skills.

| Subagent | Skills Used | Purpose |
|----------|-------------|---------|
| **`component-transformer`** | `react-to-solid`, `worktree-manager`, `shadcn-registry` | Fetches a shadcn component source, researches Kobalte/Corvu docs, transforms React-to-SolidJS, writes to `src/registry/kobalte/ui/<name>.tsx`, updates `registry.json`. Replaces `zaidan-component-syncer`. |
| **`block-transformer`** | `react-to-solid`, `worktree-manager`, `shadcn-registry` | Fetches a shadcn block/template (multi-file, multi-component compositions like `login-01`, `dashboard-01`), decomposes into individual components, transforms each, creates block files under `src/registry/kobalte/blocks/`, and updates registry. **New capability.** |
| **`docs-syncer`** | `react-to-solid` | Fetches examples from shadcn GitHub, transforms React-to-SolidJS, creates/updates MDX docs under `src/pages/ui/`. Replaces `zaidan-examples-docs-syncer` (without the git/PR parts — those move to the command layer). |
| **`registry-manager`** | `shadcn-registry`, `git-github-ops` | Handles bulk registry operations: audit `registry.json` against filesystem, detect missing entries, validate schema, fix dependency chains, update versions. |

**QA validation** is handled by the existing `bowser-qa-agent` system. After syncing a component, the orchestrating command generates a YAML user story in `ai_review/user_stories/` describing the expected UI behavior, then delegates to `bowser-qa-agent` instances via `/ui-review` for parallel visual validation.

**Why this split?** The old system merged component syncing + docs syncing + git ops + QA into two monolithic agents. By splitting them, you gain:
- **Parallelism**: Transform 5 components simultaneously, then QA-validate them in parallel via `bowser-qa-agent`.
- **Reusability**: `docs-syncer` can run independently when you only need to update examples.
- **Testability**: Test each agent in isolation at Layer 2 before orchestrating.

---

## Layer 3 — Commands (Orchestration)

Slash commands that orchestrate multi-agent workflows.

| Command | What it does |
|---------|-------------|
| **`/sync-component <name> [--primitive=kobalte\|base-ui]`** | Full component lifecycle: worktree, transform component, sync examples/docs, generate YAML user story, commit, push, PR. Orchestrates `component-transformer` then `docs-syncer` then `git-github-ops`. Generates a user story in `ai_review/user_stories/<name>.yaml` for subsequent QA via `/ui-review`. The `--primitive` flag selects the target primitive library (defaults to kobalte). |
| **`/sync-block <name>`** | Full block lifecycle: worktree, decompose block, transform all sub-components, create block composition, sync docs, generate YAML user story, commit, PR. Orchestrates `block-transformer` then `docs-syncer` then `git-github-ops`. Generates a user story in `ai_review/user_stories/<name>.yaml` for subsequent QA via `/ui-review`. |
| **`/sync-all [--filter=<pattern>]`** | Batch sync: discover all shadcn components/blocks that don't exist in Zaidan yet, fan out `component-transformer` agents in parallel (like `ui-review` fans out QA agents), generate YAML user stories for all synced items. Optional filter to scope to a subset. Run `/ui-review` afterwards to validate. |
| **`/registry-audit`** | Run `registry-manager` to audit the current registry state: check for missing entries, orphaned files, invalid dependencies, schema violations. Report without modifying. |
| **`/registry-update`** | Like audit, but applies fixes: add missing entries, remove orphans, fix dependency chains, rebuild registry output via `bun run r:build:kobalte`. |

### Example `/sync-component` workflow

```
/sync-component dialog

Phase 1: Setup
  -> worktree-manager: create trees/feat/sync-dialog, bun install

Phase 2: Transform
  -> component-transformer: fetch shadcn dialog, research Kobalte Dialog docs,
     transform React-to-SolidJS, write src/registry/kobalte/ui/dialog.tsx,
     update registry.json

Phase 3: Documentation
  -> docs-syncer: fetch examples + MDX docs, transform, write files

Phase 4: User Story
  -> Generate ai_review/user_stories/dialog.yaml with steps:
     navigate to /ui/dialog, verify examples render,
     interact with dialog trigger, verify open/close behavior

Phase 5: Ship
  -> git-github-ops: conventional commit, push, create PR with
     summary and list of changes

Phase 6 (optional, manual):
  -> /ui-review dialog — runs bowser-qa-agent against the
     generated user story for visual validation
```

---

## Layer 4 — Justfile (Reusability)

One-command recipes for every workflow.

```just
# ─── Layer 1: Skills ────────────────────────────────────
# Test the transformation skill directly
test-transform component="button":
    claude --dangerously-skip-permissions --model opus \
      "/react-to-solid transform {{component}} from shadcn to SolidJS with Kobalte"

# ─── Layer 2: Subagents ────────────────────────────────
# Run a single component transformer agent
transform-component component="accordion":
    claude --dangerously-skip-permissions --model opus \
      "Use @component-transformer to sync {{component}}"

# Run a single block transformer agent
transform-block block="login-01":
    claude --dangerously-skip-permissions --model opus \
      "Use @block-transformer to sync {{block}}"

# ─── QA (via bowser-qa-agent) ───────────────────────────
# QA validate synced components using existing bowser system
qa-component component="accordion" headed="true":
    claude --dangerously-skip-permissions --model opus \
      "/ui-review {{headed}} {{component}}"

# ─── Layer 3: Commands ─────────────────────────────────
# Full component sync (transform + docs + QA + PR)
sync-component component="accordion" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus \
      "/sync-component {{component}} --primitive={{primitive}}"

# Full block sync
sync-block block="login-01":
    claude --dangerously-skip-permissions --model opus \
      "/sync-block {{block}}"

# Batch sync all missing components
sync-all filter="":
    claude --dangerously-skip-permissions --model opus \
      "/sync-all {{filter}}"

# Registry operations
registry-audit:
    claude --dangerously-skip-permissions --model opus "/registry-audit"

registry-update:
    claude --dangerously-skip-permissions --model opus "/registry-update"

# ─── Layer 4: Composed recipes ──────────────────────────
# Sync multiple components in one shot
sync-batch *components:
    for c in {{components}}; do just sync-component $c; done
```

---

## File Structure

```
.claude/
  skills/
    react-to-solid/
      SKILL.md                      # NEW — Transformation rules (single source of truth)
      docs/
        kobalte-patterns.md         # Pre-scraped Kobalte API patterns
        corvu-patterns.md           # Pre-scraped Corvu API patterns
        base-ui-mapping.md          # Base UI to Kobalte/Corvu mapping reference
    worktree-manager/
      SKILL.md                      # Already exists — no changes needed
    shadcn-registry/
      SKILL.md                      # Already exists — no changes needed
    git-github-ops/
      SKILL.md                      # Already exists — no changes needed
  agents/
    component-transformer.md        # Replaces zaidan-component-syncer
    block-transformer.md            # NEW — shadcn blocks to Zaidan
    docs-syncer.md                  # Replaces zaidan-examples-docs-syncer
    registry-manager.md             # Registry audit/fix operations
  commands/
    sync-component.md               # Full component lifecycle orchestration
    sync-block.md                   # Full block lifecycle orchestration
    sync-all.md                     # Batch discovery + parallel sync
    registry-audit.md               # Read-only registry analysis
    registry-update.md              # Registry fix + rebuild

ai_review/
  user_stories/
    <component-name>.yaml           # Generated by sync commands, consumed by /ui-review
    <block-name>.yaml               # Generated by sync commands, consumed by /ui-review

justfile                            # Layer 4 recipes
```

### Generated User Story Format

Sync commands auto-generate YAML stories for the `bowser-qa-agent` system. Example for a synced `dialog` component:

```yaml
stories:
  - name: "Dialog component renders correctly"
    url: "http://localhost:$APP_PORT/ui/dialog"
    workflow: |
      1. Verify the page loads without console errors
      2. Verify the component preview section is visible
      3. Click the dialog trigger button
      4. Verify the dialog opens with overlay
      5. Verify dialog content is visible
      6. Close the dialog
      7. Scroll to the Examples section
      8. Verify all example variants are rendered

  - name: "Dialog documentation is complete"
    url: "http://localhost:$APP_PORT/ui/dialog"
    workflow: |
      1. Verify the page title is "Dialog"
      2. Verify the Installation section exists
      3. Verify the Usage section exists with code blocks
      4. Verify the Examples section lists all variants
      5. Scroll to the bottom of the page
      6. Verify no broken links or missing images
```

Run `/ui-review` or `just qa-component dialog` to validate these stories with `bowser-qa-agent`.

---

## Key Architectural Decisions

1. **Shared transformation skill, not duplicated tables** — The React-to-SolidJS mapping lives once in `react-to-solid/SKILL.md`. Both `component-transformer` and `block-transformer` agents reference it via the `skills:` frontmatter field.

2. **Worktree-first** — Every sync operation starts by creating a git worktree. This keeps the main working tree clean and allows parallel branches for simultaneous component syncs.

3. **Primitive-agnostic** — The `--primitive` flag on `/sync-component` allows future Base-UI SolidJS support alongside Kobalte. The `react-to-solid` skill contains mapping tables for both. The file structure already namespaces under `src/registry/kobalte/` which naturally extends to `src/registry/base-ui/`.

4. **Git ops at the command layer, not the agent layer** — The old agents did their own git commits and PR creation. In this design, agents produce file changes, and the orchestrating command handles git/PR. This avoids agents fighting over git state and makes it easier to batch commits.

5. **QA via existing bowser system** — Visual validation uses the existing `bowser-qa-agent` infrastructure. Sync commands generate YAML user stories in `ai_review/user_stories/`, then `/ui-review` fans out `bowser-qa-agent` instances for parallel validation. This avoids duplicating QA tooling and keeps validation decoupled from transformation.

6. **Blocks are first-class** — Shadcn blocks (multi-component templates like login pages, dashboards) are a distinct use case from individual components. They require dependency resolution across multiple registry items and produce more complex file structures.

---

## Migration Path from Existing Agents

| Old | New | Notes |
|-----|-----|-------|
| `zaidan-component-syncer.md` | `component-transformer.md` agent + `react-to-solid` skill + `worktree-manager` skill | Transformation tables extracted to shared skill; worktree logic extracted to reusable skill; git ops moved to command layer |
| `zaidan-examples-docs-syncer.md` | `docs-syncer.md` agent | Docs-only agent; QA delegated to existing `bowser-qa-agent` via generated YAML user stories; git ops moved to command layer |
| *(none)* | `block-transformer.md` | New capability for shadcn blocks/templates |
| *(none)* | `/sync-all` command | New batch orchestration |
| *(none)* | `registry-manager.md` + `/registry-audit` + `/registry-update` | New registry lifecycle management |

# Proposed Agentic System: Zaidan Forge

An agentic system following Bowser's four-layer architecture, purpose-built for Zaidan's component registry lifecycle. Supports both **shadcn-native components** and **any third-party component built on shadcn primitives** (Magic UI, Aceternity UI, shadcn-extension, Origin UI, etc.).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  REUSABILITY                                                             │
│  just sync-component accordion                                           │
│  just sync-external shimmer --url=... --source=...                       │
│  just sync-registry https://magicui.design/r/registry.json               │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ORCHESTRATE                                  /commands            │  │
│  │  /sync-component, /sync-block, /sync-external, /sync-registry     │  │
│  │  /registry-audit, /registry-update, /sync-all                     │  │
│  │                                                                    │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐                │  │
│  │  │ transformer │ │ transformer │ │ bowser-qa     │  ...           │  │
│  │  │ (shimmer)   │ │ (login-01)  │ │ (user stories)│                │  │
│  │  └──────┬──────┘ └──────┬──────┘ └───────┬───────┘                │  │
│  │         │               │                │                        │  │
│  │  ┌──────▼───────────────▼────────────────▼──────────────────────┐ │  │
│  │  │  SCALE                                    subagents          │ │  │
│  │  │  component-transformer  |  block-transformer                 │ │  │
│  │  │  docs-syncer  |  registry-manager  |  bowser-qa-agent (ext.) │ │  │
│  │  │                                                              │ │  │
│  │  │  ┌───────────────────────────────────────────────────────┐   │ │  │
│  │  │  │  CAPABILITY                          skills           │   │ │  │
│  │  │  │  react-to-solid  |  source-resolver                   │   │ │  │
│  │  │  │  worktree-manager (ext.)  |  shadcn-registry (ext.)   │   │ │  │
│  │  │  │  git-github-ops (ext.)                                │   │ │  │
│  │  │  └───────────────────────────────────────────────────────┘   │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Skills (Capability)

These are the atomic capabilities that agents compose.

| Skill | Purpose | Location |
|-------|---------|----------|
| **`react-to-solid`** | Core transformation engine. Contains the React-to-SolidJS mapping tables (className to class, splitProps, mergeProps, Show/For, etc.), the Base UI to Kobalte/Corvu mapping tables, AND third-party dependency mapping tables (framer-motion to solid-motionone, Zustand to SolidJS signals, Radix to Kobalte, etc.). Provides transformation rules as reusable context — no workflow, just knowledge. | `.claude/skills/react-to-solid/SKILL.md` |
| **`source-resolver`** | Resolves user-provided source inputs into a normalized, fetchable manifest. Handles: (1) raw GitHub URLs → direct fetch, (2) registry JSON endpoints → parse `files[]` array and fetch each file, (3) local file globs → read from filesystem. Outputs a normalized manifest: `{ files: [{ path, content, type }], dependencies: [], registryDependencies: [] }`. This skill abstracts away the difference between shadcn-native sources and third-party sources so agents never need to know where the code came from. | `.claude/skills/source-resolver/SKILL.md` |
| **`worktree-manager`** | (Already exists) Create, enter, list, and clean up git worktrees under `trees/`. Handles `git worktree add`, branch naming conventions (`feat/sync-<name>`, `feat/block-<name>`), `bun install` inside the worktree, and cleanup. | `.claude/skills/worktree-manager/SKILL.md` |
| **`shadcn-registry`** | (Already exists) Manage `registry.json` — add/update/remove items, validate schema against `https://ui.shadcn.com/schema/registry.json`, handle dependency resolution (`@kobalte/core`, `@corvu/*`, `cva`, `lucide-solid`), and registryDependencies cross-references. | `.claude/skills/shadcn-registry/SKILL.md` |
| **`git-github-ops`** | (Already exists) Conventional commits, push, PR creation with proper descriptions. Enforced by lefthook + commitlint. | `.claude/skills/git-github-ops/SKILL.md` |

**Key changes from existing agents**:
- The React-to-SolidJS transformation tables and the Base UI-to-Kobalte mapping are extracted into a shared skill instead of being duplicated across two agents. This is the single source of truth.
- The new `source-resolver` skill generalizes source fetching so the system is no longer hardcoded to shadcn's GitHub repo.
- The `react-to-solid` skill gains an extensible third-party dependency mapping section for non-shadcn patterns.

---

## Layer 2 — Subagents (Scale)

Isolated, parallelizable workers that compose skills.

| Subagent | Skills Used | Purpose |
|----------|-------------|---------|
| **`component-transformer`** | `react-to-solid`, `source-resolver`, `worktree-manager`, `shadcn-registry` | Transforms a React component to SolidJS/Kobalte. Accepts a **source manifest** (from `source-resolver`) and an optional **visual reference URL** (navigated via Playwright to understand the component's appearance and behavior). Researches Kobalte/Corvu docs, applies transformation rules, writes to `src/registry/kobalte/ui/<name>.tsx`, updates `registry.json`. Works with both shadcn-native and third-party sources. Replaces `zaidan-component-syncer`. |
| **`block-transformer`** | `react-to-solid`, `source-resolver`, `worktree-manager`, `shadcn-registry` | Transforms a multi-file composition (shadcn blocks like `login-01`, or third-party multi-component templates). Accepts a source manifest and optional visual reference URL. Decomposes into individual components, runs dependency analysis to check which Zaidan primitives exist and which are missing, transforms each file, creates block files under `src/registry/kobalte/blocks/`, and updates registry with `type: "registry:block"` entries. |
| **`docs-syncer`** | `react-to-solid`, `source-resolver` | Fetches examples and documentation (from shadcn GitHub or external sources via `source-resolver`), transforms React-to-SolidJS, creates/updates MDX docs under `src/pages/ui/`. Replaces `zaidan-examples-docs-syncer` (without the git/PR parts — those move to the command layer). |
| **`registry-manager`** | `shadcn-registry`, `git-github-ops` | Handles bulk registry operations: audit `registry.json` against filesystem, detect missing entries, validate schema, fix dependency chains, update versions. |

### Visual-First Transformation

When a `--url` is provided, agents use Playwright to navigate to the live component before reading source code. This "see it, then build it" approach:

1. Takes screenshots at different viewport sizes (desktop, tablet, mobile)
2. Identifies visual structure: layout, spacing, typography, colors
3. Interacts with the component: clicks, hovers, keyboard navigation
4. Observes animations, transitions, and state changes
5. Uses these observations as validation targets after transformation

This is especially valuable for third-party components where the visual behavior may not be obvious from source code alone (e.g., animated components from Magic UI, complex interactions from Aceternity UI).

### Dependency Pre-Flight

Before transforming an external component, the `component-transformer` and `block-transformer` agents perform a dependency check:

1. Parse all imports from the source manifest
2. Identify which shadcn primitives are used (button, card, input, etc.)
3. Cross-reference against Zaidan's existing `registry.json`
4. Report missing Zaidan primitives — offer to sync them first or flag as prerequisites
5. Identify non-shadcn dependencies (animation libraries, state management, etc.) and map them using the third-party tables in `react-to-solid`

This prevents partial syncs where a component is transformed but its dependencies don't exist in Zaidan.

### QA Validation

QA validation is handled by the existing `bowser-qa-agent` system. After syncing a component, the orchestrating command generates a YAML user story in `ai_review/user_stories/` describing the expected UI behavior, then delegates to `bowser-qa-agent` instances via `/ui-review` for parallel visual validation.

When a `--url` was provided, the generated user story includes comparison steps: navigate to the original URL, screenshot, navigate to the Zaidan version, screenshot, compare.

**Why this split?** The old system merged component syncing + docs syncing + git ops + QA into two monolithic agents. By splitting them, you gain:
- **Parallelism**: Transform 5 components simultaneously, then QA-validate them in parallel via `bowser-qa-agent`.
- **Reusability**: `docs-syncer` can run independently when you only need to update examples.
- **Testability**: Test each agent in isolation at Layer 2 before orchestrating.
- **Source flexibility**: Any agent can work with any source (shadcn, Magic UI, local files) thanks to `source-resolver`.

---

## Layer 3 — Commands (Orchestration)

Slash commands that orchestrate multi-agent workflows.

### Core Commands

| Command | What it does |
|---------|-------------|
| **`/sync-component <name> [--primitive=kobalte\|base-ui] [--url=<live-url>] [--source=<url-or-glob>]`** | Full component lifecycle: worktree, transform component, sync examples/docs, generate YAML user story, commit, push, PR. When `--url` and `--source` are omitted, defaults to shadcn's GitHub. When provided, uses `source-resolver` to fetch from external sources and Playwright to analyze the live component. Orchestrates `component-transformer` then `docs-syncer` then `git-github-ops`. |
| **`/sync-block <name> [--url=<live-url>] [--source=<url-or-glob>]`** | Full block lifecycle: worktree, decompose block, dependency pre-flight, transform all sub-components, create block composition, sync docs, generate YAML user story, commit, PR. Same `--url`/`--source` behavior as `/sync-component`. |
| **`/sync-external <name> --url=<live-url> --source=<url-or-glob> [--type=component\|block] [--primitive=kobalte]`** | Dedicated command for external (non-shadcn) sources. Requires both `--url` (visual reference) and `--source` (React code). Auto-detects component vs block from file count, overridable with `--type`. Full workflow: analyze visuals, resolve sources, dependency check, transform, validate, docs, ship. |
| **`/sync-registry <registry-url> [--filter=<pattern>] [--dry-run]`** | Batch sync from an entire third-party registry. Fetches the registry manifest, diffs against Zaidan's `registry.json`, discovers all components not yet in Zaidan, and fans out `component-transformer` agents in parallel. `--dry-run` reports what would be synced without making changes. |
| **`/sync-all [--filter=<pattern>]`** | Batch sync: discover all shadcn components/blocks that don't exist in Zaidan yet, fan out `component-transformer` agents in parallel, generate YAML user stories for all synced items. Optional filter to scope to a subset. Run `/ui-review` afterwards to validate. |
| **`/registry-audit`** | Run `registry-manager` to audit the current registry state: check for missing entries, orphaned files, invalid dependencies, schema violations. Report without modifying. |
| **`/registry-update`** | Like audit, but applies fixes: add missing entries, remove orphans, fix dependency chains, rebuild registry output via `bun run r:build:kobalte`. |

### Example `/sync-component` workflow (shadcn-native)

```
/sync-component dialog

Phase 1: Setup
  -> worktree-manager: create trees/feat/sync-dialog, bun install

Phase 2: Transform
  -> source-resolver: resolve shadcn GitHub URL (default source)
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

### Example `/sync-external` workflow (third-party)

```
/sync-external shimmer-button \
  --url=https://magicui.design/docs/components/shimmer-button \
  --source=https://raw.githubusercontent.com/magicuidesign/magicui/main/registry/magicui/shimmer-button.tsx

Phase 0: Analyze
  -> Playwright: navigate to --url, screenshot at desktop/tablet/mobile,
     interact with the component (hover, click), observe animations,
     record visual reference
  -> source-resolver: fetch --source, parse imports, produce normalized
     manifest with files, dependencies, registryDependencies

Phase 1: Setup
  -> worktree-manager: create trees/feat/sync-shimmer-button, bun install

Phase 2: Dependency Check
  -> Parse imports from source manifest
  -> Cross-reference against registry.json
  -> Report: "shimmer-button depends on 'button' — already in Zaidan ✓"
  -> Identify: framer-motion → map to solid-motionone (react-to-solid skill)

Phase 3: Transform
  -> component-transformer: apply react-to-solid transformation rules,
     map framer-motion to solid-motionone, handle CSS animations/keyframes,
     write src/registry/kobalte/ui/shimmer-button.tsx,
     update registry.json with dependencies and cssVars

Phase 4: Visual Validation
  -> Start dev server, navigate to the new component's preview
  -> Compare screenshots against Phase 0 reference
  -> Generate ai_review/user_stories/shimmer-button.yaml including
     comparison steps against the original URL

Phase 5: Documentation
  -> docs-syncer: create examples + MDX docs (adapted from source)

Phase 6: Ship
  -> git-github-ops: conventional commit, push, create PR with
     summary, visual diff, and links to original source

Phase 7 (optional, manual):
  -> /ui-review shimmer-button — runs bowser-qa-agent for visual validation
```

### Example `/sync-registry` workflow (batch third-party)

```
/sync-registry https://magicui.design/r/registry.json --filter="shimmer|marquee|globe"

Phase 1: Discovery
  -> Fetch https://magicui.design/r/registry.json
  -> Parse all component entries
  -> Diff against Zaidan's registry.json
  -> Apply --filter to scope results
  -> Report: "3 components to sync: shimmer-button, marquee, globe"

Phase 2: Parallel Transform
  -> Fan out 3 component-transformer agents in parallel:
     - component-transformer (shimmer-button)
     - component-transformer (marquee)
     - component-transformer (globe)
  -> Each agent uses source-resolver to fetch from the registry's
     file URLs and react-to-solid for transformation

Phase 3: Aggregate
  -> Collect results from all agents
  -> Generate user stories for each component
  -> Single conventional commit with all changes
  -> Push, create PR listing all synced components

Phase 4 (optional, manual):
  -> /ui-review — validates all new components in parallel
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

# ─── Layer 3: Commands — shadcn-native ─────────────────
# Full component sync (transform + docs + QA + PR)
sync-component component="accordion" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus \
      "/sync-component {{component}} --primitive={{primitive}}"

# Full block sync
sync-block block="login-01":
    claude --dangerously-skip-permissions --model opus \
      "/sync-block {{block}}"

# Batch sync all missing shadcn components
sync-all filter="":
    claude --dangerously-skip-permissions --model opus \
      "/sync-all {{filter}}"

# ─── Layer 3: Commands — external sources ──────────────
# Sync a component from any external source
sync-external name url="" source="" type="component" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus \
      "/sync-external {{name}} --url={{url}} --source={{source}} --type={{type}} --primitive={{primitive}}"

# Batch sync from a third-party registry
sync-registry registry_url="" filter="":
    claude --dangerously-skip-permissions --model opus \
      "/sync-registry {{registry_url}} --filter={{filter}}"

# ─── Layer 3: Commands — registry operations ──────────
# Registry operations
registry-audit:
    claude --dangerously-skip-permissions --model opus "/registry-audit"

registry-update:
    claude --dangerously-skip-permissions --model opus "/registry-update"

# ─── Layer 4: Composed recipes ──────────────────────────
# Sync multiple shadcn components in one shot
sync-batch *components:
    for c in {{components}}; do just sync-component $c; done

# Sync all components from Magic UI
sync-magicui filter="":
    just sync-registry "https://magicui.design/r/registry.json" "{{filter}}"
```

---

## Source Resolution

The `source-resolver` skill normalizes different input formats into a consistent manifest that agents consume. This is what makes the system source-agnostic.

### Supported Input Formats

| Input Format | Example | Resolution |
|--------------|---------|------------|
| **shadcn default** (no `--source`) | `/sync-component dialog` | Fetch from `https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/dialog.tsx` |
| **Raw GitHub URL** | `--source=https://raw.githubusercontent.com/magicuidesign/magicui/main/registry/magicui/shimmer-button.tsx` | Direct fetch, parse imports for dependencies |
| **Registry JSON endpoint** | `--source=https://magicui.design/r/shimmer-button.json` | Fetch JSON, parse `files[]` array, fetch each file's content |
| **Multiple URLs** | `--source=https://...one.tsx --source=https://...two.tsx` | Fetch each URL, combine into multi-file manifest |
| **Local globs** | `--source="./external/magic-ui/src/**/*.tsx"` | Read matching files from the local filesystem |

### Normalized Manifest Format

Regardless of input format, `source-resolver` produces:

```json
{
  "source": "magicui",
  "name": "shimmer-button",
  "files": [
    {
      "path": "shimmer-button.tsx",
      "content": "import { cn } from \"@/lib/utils\";\nimport ...",
      "type": "registry:ui"
    }
  ],
  "dependencies": ["framer-motion", "tailwindcss-animate"],
  "registryDependencies": ["button"],
  "cssVars": {
    "theme": {
      "animate-shimmer": "shimmer 2s linear infinite"
    }
  }
}
```

Agents receive this manifest and never need to know whether the source was a GitHub URL, a registry endpoint, or a local file.

---

## Third-Party Dependency Mapping

The `react-to-solid` skill contains an extensible section for mapping third-party React libraries to their SolidJS equivalents. This table is consulted during transformation when non-shadcn imports are encountered.

| React Library | SolidJS Equivalent | Notes |
|---------------|-------------------|-------|
| `framer-motion` | `solid-motionone` / CSS animations | Animation library; simple animations can use CSS keyframes instead |
| `react-hook-form` | `@modular-forms/solid` | Form state management |
| `zustand` | SolidJS signals + stores | State management; direct mapping to `createSignal`/`createStore` |
| `@radix-ui/*` | `@kobalte/core/*` | Primitives; covered by the Base UI-to-Kobalte mapping |
| `react-icons` | `lucide-solid` / `solid-icons` | Icon libraries |
| `recharts` | `solid-chartjs` / direct Chart.js | Charting libraries |
| `react-resizable-panels` | `@corvu/resizable` | Resizable panels |
| `input-otp` | `input-otp` | Same package works (framework-agnostic core) |
| `vaul` | `@corvu/drawer` | Drawer/bottom sheet |
| `sonner` | `solid-sonner` | Toast notifications |
| `embla-carousel-react` | `embla-carousel-solid` | Carousel |
| `cmdk` | `@kobalte/core/combobox` | Command palette; map to Kobalte Combobox |
| `@tanstack/react-table` | `@tanstack/solid-table` | Data tables |
| `@tanstack/react-virtual` | `@tanstack/solid-virtual` | Virtualization |
| `react-day-picker` | custom SolidJS calendar | Calendar; requires custom implementation |
| `next/image` | `<img>` with lazy loading | Framework-specific; strip to native HTML |
| `next/link` | TanStack Router `<Link>` | Framework-specific; map to project router |

When an unmapped dependency is encountered, the agent should:
1. Flag it in the transformation report
2. Search for a SolidJS equivalent via web search
3. If none exists, attempt a manual port or flag as requiring human review

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
        third-party-deps.md         # NEW — Third-party React-to-SolidJS dependency mapping
    source-resolver/
      SKILL.md                      # NEW — Normalize external source inputs into manifest
    worktree-manager/
      SKILL.md                      # Already exists at user scope — no changes needed
    shadcn-registry/
      SKILL.md                      # Already exists at user scope — no changes needed
    git-github-ops/
      SKILL.md                      # Already exists at user scope — no changes needed
  agents/
    component-transformer.md        # Replaces zaidan-component-syncer (supports external sources)
    block-transformer.md            # NEW — shadcn blocks + external multi-file compositions
    docs-syncer.md                  # Replaces zaidan-examples-docs-syncer
    registry-manager.md             # Registry audit/fix operations
  commands/
    sync-component.md               # Full component lifecycle (shadcn + external via --url/--source)
    sync-block.md                   # Full block lifecycle (shadcn + external via --url/--source)
    sync-external.md                # NEW — Dedicated external source sync command
    sync-registry.md                # NEW — Batch sync from third-party registry
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

When synced from an external source with `--url`, user stories include visual comparison steps:

```yaml
stories:
  - name: "Shimmer Button matches original design"
    url: "http://localhost:$APP_PORT/ui/shimmer-button"
    reference_url: "https://magicui.design/docs/components/shimmer-button"
    workflow: |
      1. Navigate to the reference URL and screenshot the component
      2. Navigate to the Zaidan version URL
      3. Verify the component renders with shimmer animation
      4. Verify hover state triggers the animation
      5. Compare visual appearance against reference screenshot
      6. Verify responsive behavior at mobile viewport
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

7. **Source-agnostic input** — The `source-resolver` skill abstracts away the difference between raw GitHub URLs, registry JSON endpoints, and local file globs. Agents receive a normalized manifest and never need to know where the code came from. This makes the system extensible to any React component library built on shadcn primitives.

8. **Visual-first transformation** — External components are first visited in a live browser via Playwright. The agent observes the component's rendering, animations, responsive behavior, and interactions before reading source code. This produces better transformations because the agent validates against a visual reference, not just code patterns.

9. **Dependency pre-flight** — Before transforming an external component, the system checks if all shadcn primitives it depends on already exist in Zaidan. Missing dependencies are reported upfront rather than discovered mid-transformation. This prevents partial syncs.

10. **Registry-as-discovery** — Third-party registries serve as both distribution endpoints and discovery mechanisms. `/sync-registry` can diff an entire external registry against Zaidan's registry to find what's missing, enabling bulk adoption of component ecosystems.

---

## Migration Path from Existing Agents

| Old | New | Notes |
|-----|-----|-------|
| `zaidan-component-syncer.md` | `component-transformer.md` agent + `react-to-solid` skill + `source-resolver` skill + `worktree-manager` skill | Transformation tables extracted to shared skill; source fetching generalized via `source-resolver`; worktree logic extracted to reusable skill; git ops moved to command layer |
| `zaidan-examples-docs-syncer.md` | `docs-syncer.md` agent | Docs-only agent; QA delegated to existing `bowser-qa-agent` via generated YAML user stories; git ops moved to command layer |
| *(none)* | `source-resolver` skill | New capability: normalize any source input (GitHub, registry, local) into a fetchable manifest |
| *(none)* | `block-transformer.md` | New capability for shadcn blocks/templates and external multi-file compositions |
| *(none)* | `/sync-external` command | New orchestration for external (non-shadcn) component sources |
| *(none)* | `/sync-registry` command | New batch sync from entire third-party registries |
| *(none)* | `/sync-all` command | New batch orchestration for shadcn components |
| *(none)* | `registry-manager.md` + `/registry-audit` + `/registry-update` | New registry lifecycle management |

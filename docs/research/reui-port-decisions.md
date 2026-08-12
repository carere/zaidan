# reui → Zaidan port: shared decisions

Contract for the five block ports (`data-grid`, `filters`, `kanban`,
`event-calendar`, `gantt`) from [reui](https://reui.io). Every port agent reads
this before touching files.

## Sources

Upstream clone: `~/.btca/agent/sandbox/reui` (shallow, `main`).

| Artifact | Path in clone |
| --- | --- |
| Component source | `registry-reui/bases/base/reui/<name>/` or `<name>.tsx` |
| Registry metadata | `registry-reui/bases/base/reui/_registry.ts` |
| Docs MDX | `content/docs/(components)/base/<name>.mdx` |
| Demos | `registry-reui/bases/base/components/<name>/c-<name>-N.tsx` |
| Playground | `https://reui.io/components/<name>` |

## Scope

**Port only the demos referenced by the component's MDX** via
`<ComponentPreview name="..." />`. Do not port the full playground gallery.

| Block | MDX demos to port |
| --- | --- |
| data-grid | `c-data-grid-1,2,3,4,5,6,7,30` |
| filters | `c-filters-1,2,3,4,5,6,7,9,10,11,12` |
| kanban | `c-kanban-1,2,6` |
| event-calendar | `c-event-calendar-1` |
| gantt | `c-gantt-1,3,4,5` |

Re-derive the list from the MDX rather than trusting this table blindly; if it
disagrees, the MDX wins.

## Cross-block independence

Verified by import graph: **no block imports another block.** Do not introduce
one. In particular, `gantt-recurrence.tsx` and `event-calendar-recurrence.tsx`
overlap by roughly 40% — **keep them separate**, each inside its own block, so
each block installs standalone. Same for `gantt-i18n` / `event-calendar-i18n`.

## Substitutions

| Upstream | Zaidan |
| --- | --- |
| `@/app/(create)/components/icon-placeholder` `IconPlaceholder` | the concrete `lucide-solid` icon named by the `lucide=` prop |
| `@/registry-reui/bases/base/reui/badge` `Badge` | `@/registry/kobalte/ui/badge` (`variant="secondary"` where upstream used it) |
| `@/registry-reui/bases/base/reui/icon-stack` `IconStack` | `@/registry/kobalte/ui/icon-stack` — **already ported, on `feat/reui-base`** |
| `@/registry/bases/base/lib/utils` | `@/lib/utils` |
| `@/registry/bases/base/ui/*` | `@/registry/kobalte/ui/*` |
| `@base-ui/react/use-render` `useRender` | direct JSX, or `Dynamic` + `splitProps` — see `react-to-solid` skill §"Base UI useRender" |
| `@base-ui/react/merge-props` `mergeProps` | `mergeProps` from `solid-js` |
| `@base-ui/react/scroll-area` | `@/registry/kobalte/ui/scroll-area`, or vanilla Solid if the wrapper does not expose what the block needs |
| `@tanstack/react-table` | `@tanstack/solid-table@^9.1.2` (v9, matches upstream) |
| `@tanstack/react-virtual` | `@tanstack/solid-virtual@^3.13.36` |
| `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` + `@dnd-kit/modifiers` | `@dnd-kit/solid@^0.5.0` |
| `lucide-react` | `lucide-solid` |

`IconPlaceholder` renders a per-library icon; take the `lucide=` prop value and
import that icon from `lucide-solid`. Example: `lucide="CalendarIcon"` →
`import { Calendar } from "lucide-solid"` (drop the `Icon` suffix, which
`lucide-solid` does not use).

### dnd-kit is a rewrite, not a translation

`@dnd-kit/solid@0.5` is the *next-generation* dnd-kit architecture. The
React v6 API upstream uses (`DndContext`, `useSortable`, `CSS.Transform`,
`arrayMove`, `closestCenter`, modifiers) does **not** map one-to-one.

Read `src/registry/kobalte/blocks/sortable.tsx` first — it is the in-repo
precedent for `DragDropProvider`, `DragOverlay`, `PointerSensor`,
`KeyboardSensor`, and `useSortable` from `@dnd-kit/solid/sortable`, including
the SSR guard (`live()` flips after mount because the library is browser-only).
Match its patterns.

Affects: `kanban.tsx`, `data-grid/data-grid-table-dnd.tsx`,
`data-grid/data-grid-table-dnd-rows.tsx`.

`event-calendar-dnd.tsx` and `gantt-dnd.tsx` are **hand-rolled pointer-event
DnD with no library** — port them as ordinary DOM code, do not reach for
dnd-kit.

## Styles: nothing to do

These blocks are near-entirely raw Tailwind. There are exactly **two** semantic
markers across all 28k lines, both in `filters.tsx`:

- `cn-input` → `z-input`
- `cn-input-group` → `z-input-group`

Inline `style-vega:` / `style-nova:` / … variants carry over verbatim — Zaidan
declares the identical `@custom-variant` set in `src/styles.css`.

**Do not touch `src/registry/kobalte/styles/style-*.css`.** No new `z-*` classes.
If you believe a style slice needs editing, stop and report instead.

## Solid translation

Follow `.agents/skills/react-to-solid/SKILL.md`. Non-negotiables:

- `splitProps` / `mergeProps`; never destructure props used in JSX.
- `<Show>` / `<For>` instead of `&&` and `.map()`.
- Signals are called: `value()`.
- No `forwardRef`, no `React.`, no `className`, no `useCallback`.
- `createMemo` only for genuinely reactive derived values — not as a
  `useMemo` transliteration. Most `useMemo` in these sources becomes a plain
  function or a derived accessor.
- Upstream "subscribable store + selector hooks" engines (`useEventCalendarState`,
  `useGanttState`, the data-grid context) become Solid stores/signals with
  derived accessors. Fine-grained reactivity replaces the selector-subscription
  machinery — do not port the subscription bookkeeping literally.
- Preserve public API names, `data-slot` attributes, Tailwind classes, CSS
  variables, and accessibility behavior.

## Targets

```
src/registry/kobalte/blocks/<name>/index.tsx      # + internals, one file per upstream file
src/registry/kobalte/examples/docs/<name>-*.tsx   # default-export demos
src/pages/blocks/kobalte/<name>.mdx               # auto-registers in the sidebar via velite
src/pages/blocks/kobalte/<name>-docs.test.ts
src/registry/kobalte/registry.json                # one registry:block entry
```

Demo file names are Zaidan-style slugs, not upstream `c-<name>-N`. Pick a
descriptive slug per demo (e.g. `data-grid-demo`, `data-grid-pagination`) and
keep the slug identical across the MDX `<ComponentPreview name>`, the file in
`examples/docs/`, and the docs test.

Read `src/registry/kobalte/blocks/questionnaire/`,
`src/pages/blocks/kobalte/sortable.mdx`, and
`src/pages/blocks/kobalte/sortable-docs.test.ts` before writing; match them.

### Block composition rule

Keep the installable surface as small as the public primitive requires.
Reusable primitives, context, helpers, and types go in the block. Product-specific
layout, dialogs, and sample data go in the demo under `examples/docs/`.

## registry.json

Each block adds one `registry:block` entry, alphabetically placed, listing every
internal file with `"type": "registry:component"` and a
`"target": "components/blocks/<name>/<file>"`. `registryDependencies` use the
full URL form: `https://zaidan.carere.dev/r/kobalte/<item>.json`.

**This file is the only one all five branches touch.** Expect a conflict at
merge; write your entry cleanly and do not reformat neighbours.

## Validation

```bash
bun --bun biome check --write <changed-files>
bun --bun tsc --noEmit
moon run :r-validate-kobalte
bunx vitest run src/pages/blocks/kobalte/<name>-docs.test.ts
```

React-leftover sweep before reporting done:

```bash
rg 'className|forwardRef|from "react"|from "lucide-react"|React\.|useState|useEffect|useMemo|useCallback' <changed-files>
```

Use `bunx`, never `npx`.

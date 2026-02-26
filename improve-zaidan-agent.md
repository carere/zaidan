# Improve Zaidan Agent System

## Overview

Two improvements to the Zaidan agent system:
1. **Remove registry separation in UI** — present items by type (UI / Blocks) instead of by registry
2. **Registry-prefixed block names** — avoid naming collisions between registries

---

## Point 1: Remove Registry Separation — Reorganize by Type (UI vs Blocks)

### Decision: Option A — Keep internal per-registry storage, merge in UI

Internal organization stays per-registry (important for sync agents which operate per-registry), but the item-picker and item-explorer present merged views grouped by type.

### Current grouping (item-picker & item-explorer)

```
├── Getting Started     (docs, no registry)
├── Bazza               (registry: "bazza")
├── Motion Primitives   (registry: "motion-primitives")
└── Shadcn              (registry: "shadcn")
```

### Target grouping

```
├── Getting Started     (docs)
├── Blocks              (all external registry items: bazza, motion-primitives, etc.)
└── UI                  (shadcn components only)
```

### Internal storage (unchanged)

- Velite collections stay per-registry in `velite.config.ts` (shadcn, bazza, motionPrimitives)
- MDX docs stay in `src/pages/<registry>/<primitive>/`
- Examples stay in `src/registry/<primitive>/examples/<registry>/`
- Single `registry.json` at `src/registry/kobalte/registry.json`

### URL routing change

| Before | After |
|--------|-------|
| `/registry/shadcn/button` | `/ui/button` |
| `/registry/bazza/accordion` | `/blocks/bazza-accordion` |
| `/registry/motion-primitives/marquee` | `/blocks/motion-primitives-marquee` |
| `/registry/shadcn/button/docs` | `/ui/button/docs` |
| `/registry/bazza/accordion/docs` | `/blocks/bazza-accordion/docs` |

### Files impacted

| File | Change |
|------|--------|
| `src/components/item-picker.tsx` | Merge all Velite collections into two groups (UI + Blocks), update route refs |
| `src/components/item-explorer.tsx` | Same as item-picker |
| `src/lib/registries.ts` | Add `kind` concept (ui/block), add helpers for merging collections |
| `src/lib/registry-entries.ts` **(NEW)** | Extract shared entry logic (currently duplicated between picker/explorer): `Entry[]` array, `isDraft()`, `filterDrafts()`, sorting |
| `velite.config.ts` | Add `registry` field to each collection schema so merged items carry provenance |
| **Route files — DELETE** | `_website.registry.$registry.{-$slug}.tsx`, `_website.registry.$registry.$slug.docs.tsx` |
| **Route files — CREATE** | `_website.ui.{-$slug}.tsx`, `_website.ui.$slug.docs.tsx`, `_website.blocks.{-$slug}.tsx`, `_website.blocks.$slug.docs.tsx` |
| `preview.$registry.$primitive.$slug.tsx` | Update to `preview.$kind.$primitive.$slug.tsx` (kind = ui/blocks) |
| `.claude/commands/sync.md` | Phase 3 (registry integration): update entries by "kind" not by registry name |

### Route loader design

`/ui/` routes load **only from the shadcn collection** (canonical UI components). `/blocks/` routes load **from all external registries** (bazza, motion-primitives, origin-ui, etc.):

```typescript
// _website.ui.{-$slug}.tsx loader — shadcn only
const doc = shadcn.find(u => u.slug === params.slug);

// _website.blocks.{-$slug}.tsx loader — all external registries
const allBlocks = [...bazza, ...motionPrimitives];
const doc = allBlocks.find(u => u.slug === params.slug);
```

This clean separation means: shadcn = UI, everything else = Blocks. No need for `isUI`/`isBlock` classification — the source registry determines the kind.

### Shared utility extraction

Extract from both `item-picker.tsx` and `item-explorer.tsx` into `src/lib/registry-entries.ts`:

```typescript
export type Entry = {
  title: string;
  items: MergedItem[];
  route: FileRouteTypes["to"];
};

export function getEntries(): Entry[] {
  return [
    { title: "Getting Started", items: getDocs(), route: "/{-$slug}" },
    { title: "Blocks", items: getAllBlocks(), route: "/blocks/{-$slug}" },
    { title: "UI", items: getAllUI(), route: "/ui/{-$slug}" },
  ];
}
```

---

## Point 2: Registry-Prefixed Block Names for Collision Avoidance

### Naming convention

| Source | Type | Registry Name | Display Name (picker/explorer) |
|--------|------|---------------|-------------------------------|
| shadcn | UI | `accordion` | `Accordion` |
| origin-ui | Block | `origin-ui-accordion` | `Accordion (Origin UI)` |
| magic-ui | Block | `magic-ui-marquee` | `Marquee (Magic UI)` |
| shadcn | UI | `button` | `Button` |
| bazza | Block | `bazza-button` | `Button (Bazza)` |

**Rule**: Shadcn UI components keep simple names (canonical source). External registry blocks get prefixed with `<registry-name>-`.

### Files impacted

| File | Change |
|------|--------|
| `.claude/agents/zaidan-transformer.md` | Step 10 (REGISTRY_ENTRY output): apply `<REGISTRY_NAME>-` prefix to `name` field when registry is not `shadcn` |
| `.claude/commands/sync.md` | Phase 1 (discovery) and Phase 4.6 (registry update): apply naming convention |
| `src/registry/kobalte/registry.json` | Existing bazza/motion-primitives entries need renaming with prefix |
| `src/components/item-picker.tsx` | Display: strip registry prefix, append `(Registry Label)` for non-shadcn items |
| `src/components/item-explorer.tsx` | Same display logic |
| `src/lib/registries.ts` | Add helpers: `getDisplayName(item, registry)` and `getRegistrySlug(component, registry)` |
| `.claude/agents/registry-manager.md` | Add naming convention validation to audit checks |

### Display name implementation

```tsx
<CommandItem value={item.slug}>
  {item.title}
  <Show when={item.registry && item.registry !== "shadcn"}>
    <span class="text-muted-foreground ml-1">
      ({REGISTRY_META[item.registry].label})
    </span>
  </Show>
</CommandItem>
```

Each merged item must carry a `registry` field to identify its source — ensured by adding `registry` to the Velite collection schemas (Point 1).

### Registry dependency URLs

No change needed. External blocks referencing canonical shadcn items use: `https://zaidan.carere.dev/r/kobalte/button.json`. External blocks referencing other blocks from same registry use prefixed names: `https://zaidan.carere.dev/r/kobalte/origin-ui-accordion.json`.

---

## Combined Change Summary

### New files

| File | Purpose |
|------|---------|
| `src/lib/registry-entries.ts` | Shared entry logic for picker/explorer |
| `src/routes/_website.ui.{-$slug}.tsx` | UI component preview route |
| `src/routes/_website.ui.$slug.docs.tsx` | UI component docs route |
| `src/routes/_website.blocks.{-$slug}.tsx` | Block preview route |
| `src/routes/_website.blocks.$slug.docs.tsx` | Block docs route |

### Modified files (agent system)

| File | Change |
|------|--------|
| `.claude/agents/zaidan-transformer.md` | Naming prefix for non-shadcn registries |
| `.claude/commands/sync.md` | Naming convention, entry merging by kind |
| `.claude/agents/registry-manager.md` | Naming convention validation |

### Modified files (website)

| File | Change |
|------|--------|
| `src/components/item-picker.tsx` | Merged UI/Blocks groups, display name with registry label, use shared entries |
| `src/components/item-explorer.tsx` | Same as item-picker |
| `src/lib/registries.ts` | Helpers for naming, display, kind detection |
| `velite.config.ts` | Add `registry` field to collection schemas |
| `src/registry/kobalte/registry.json` | Rename existing bazza/motion-primitives entries with prefix |

### Deleted files

| File | Reason |
|------|--------|
| `src/routes/_website.registry.$registry.{-$slug}.tsx` | Replaced by `/ui/` and `/blocks/` routes |
| `src/routes/_website.registry.$registry.$slug.docs.tsx` | Same |

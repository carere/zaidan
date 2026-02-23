# Multi-Registry System Update

## Overview

Update the Zaidan website to support multiple registries with the URL pattern `zaidan.carere.dev/<registry-name>/<component-name>`.

### Registries

| Registry | Description | URL Pattern |
|----------|-------------|-------------|
| `shadcn` | Direct ports from shadcn/ui (formerly `/ui/`) | `/shadcn/<component>` |
| `bazza-ui` | Bazza UI components | `/bazza-ui/<component>` |
| `coss-com` | Coss Com components | `/coss-com/<component>` |

### Key Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Velite collections | One collection per registry |
| 2 | Route structure | Dynamic `$registry` param with allowlist guard |
| 3 | Registry JSON URLs | Flat namespace per primitive — `zaidan.carere.dev/r/{primitive}/{component}.json` for all components regardless of registry |
| 4 | CLI installation | No changes — CLI uses the flat registry URL, no registry awareness needed |
| 5 | Preview system | Registry-aware import paths |
| 6 | Navigation/sidebar | Section per registry |
| 7 | Registry build | Single `registry.json` per primitive — new components added as `registry:block` items alongside existing `registry:ui` items |
| 8 | Old URL redirects | TanStack Router `beforeLoad` redirect + Cloudflare `_redirects` |
| 9 | Example organization | Grouped by registry: `src/registry/<primitive>/examples/<registry-name>/` |
| 10 | Search params | Registry derived from route param, no additional search param needed |
| 11 | Default component | First item in the respective registry collection |

---

## Current Architecture

### Routing (TanStack Solid Router, file-based)

| Route File | URL | Purpose |
|------------|-----|---------|
| `_website.ui.{-$slug}.tsx` | `/ui/{slug}` | Component preview (iframe) |
| `_website.ui.$slug.docs.tsx` | `/ui/{slug}/docs` | Component documentation |
| `_website.{-$slug}.tsx` | `/{slug}` | General docs (home, installation) |
| `_website.installation.$slug.tsx` | `/installation/{slug}` | Framework install guides |
| `preview.$primitive.$slug.tsx` | `/preview/{primitive}/{slug}` | Isolated iframe preview |

### Velite Collections (`velite.config.ts`)

Two collections with hardcoded glob patterns:
- `docs`: `docs/**/*.mdx`
- `ui`: `ui/**/*.mdx`

### Registry Structure

```
src/registry/kobalte/
├── registry.json       # Master registry (69 items)
├── ui/                 # 54 UI components
├── examples/           # 54 example files ({slug}-example.tsx)
├── hooks/              # Custom hooks
├── components/         # Support components
└── styles/             # Theme CSS files
```

### Registry Build

```json
"r:build:kobalte": "shadcn build src/registry/kobalte/registry.json --output public/r/kobalte"
```

Output: `public/r/kobalte/*.json` served at `https://zaidan.carere.dev/r/kobalte/`

### Registry Dependencies

All `registryDependencies` use full URLs:
```json
"registryDependencies": ["https://zaidan.carere.dev/r/kobalte/button.json"]
```

### Navigation

- `ItemExplorer` (sidebar): Two hardcoded sections — "Getting Started" and "UI"
- `ItemPicker` (Cmd+K): Searches across `docs` and `ui` collections
- `PageToggleNav`: Toggles between `/ui/{-$slug}` and `/ui/$slug/docs`

### Hardcoded `/ui/` References

| File | Reference |
|------|-----------|
| `src/components/item-explorer.tsx` | Sidebar links to `/ui/{-$slug}` |
| `src/components/item-picker.tsx` | Command palette links to `/ui/{-$slug}` |
| `src/components/page-toggle-nav.tsx` | Toggle between preview/docs |
| `src/components/not-found-page.tsx` | 404 navigation fallback |
| `src/components/random-button.tsx` | Random component button |
| `src/pages/docs/home.mdx` | Hardcoded link `/ui/accordion` |
| `src/routes/_website.ui.{-$slug}.tsx` | SEO metadata `path: /ui/${slug}` |
| `src/routes/_website.ui.$slug.docs.tsx` | SEO metadata `path: /ui/${slug}/docs` |

### Preview System

- Parent page embeds iframe to `/preview/$primitive/$slug`
- Dynamic import: `../registry/${primitive}/examples/${slug}-example.tsx`
- Design system config synced via `postMessage` (IframeMessage protocol)
- Default component when no slug: `"button"`

### CLI Installation

- Installation docs (6 files in `src/pages/docs/installation/`) reference:
  ```
  https://zaidan.carere.dev/r/{style}/{name}.json
  ```
- `cli-button.tsx` generates commands: `shadcn@latest add @zaidan/<component>`
- **No changes needed** — the CLI accesses `zaidan.carere.dev/r/{primitive}/{component}.json` regardless of which registry a component belongs to

---

## Proposed Changes

### 1. File Structure

#### Pages (MDX Documentation)

```
src/pages/
├── docs/                    # Unchanged — getting started, installation
│   ├── home.mdx
│   ├── installation.mdx
│   └── installation/
├── shadcn/                  # Renamed from src/pages/ui/
│   └── kobalte/
│       ├── button.mdx
│       ├── dialog.mdx
│       └── ...
├── bazza-ui/                # New registry docs
│   └── kobalte/
│       ├── data-table-picker.mdx
│       └── ...
└── coss-com/                # New registry docs
    └── kobalte/
        ├── accordion.mdx
        └── ...
```

#### Registry (Components & Blocks)

All components live under a single `registry.json` per primitive. New registry components are registered as `registry:block` items.

```
src/registry/kobalte/
├── registry.json            # Single registry file — contains all UI + block items
├── ui/                      # Existing 54 shadcn UI components (registry:ui)
├── examples/
│   ├── shadcn/              # Existing examples (moved from examples/)
│   │   ├── button-example.tsx
│   │   ├── dialog-example.tsx
│   │   └── ...
│   ├── bazza-ui/            # Examples for bazza-ui blocks
│   │   ├── data-table-picker-example.tsx
│   │   └── ...
│   └── coss-com/            # Examples for coss-com blocks
│       ├── accordion-example.tsx
│       └── ...
├── hooks/
├── components/
├── styles/
└── blocks/                  # New registries as blocks (registry:block)
    ├── bazza-ui/
    │   ├── data-table-picker/
    │   │   ├── data-table-picker.tsx
    │   │   └── ...related files
    │   └── ...
    └── coss-com/
        ├── accordion/
        │   ├── accordion.tsx
        │   └── ...related files
        └── ...
```

#### Registry JSON Example

All items coexist in a single `registry.json` per primitive:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "zaidan",
  "homepage": "https://zaidan.carere.dev",
  "items": [
    {
      "name": "button",
      "type": "registry:ui",
      "dependencies": ["@kobalte/core", "class-variance-authority"],
      "registryDependencies": [],
      "files": [
        { "path": "src/registry/kobalte/ui/button.tsx", "type": "registry:ui" }
      ]
    },
    {
      "name": "data-table-picker",
      "type": "registry:block",
      "dependencies": ["@kobalte/core"],
      "registryDependencies": ["https://zaidan.carere.dev/r/kobalte/button.json"],
      "files": [
        { "path": "src/registry/kobalte/blocks/bazza-ui/data-table-picker/data-table-picker.tsx", "type": "registry:block" }
      ]
    }
  ]
}
```

Since all items share one `registry.json`, the built output stays flat:
```
public/r/kobalte/
├── button.json                 # registry:ui (shadcn)
├── data-table-picker.json      # registry:block (bazza-ui)
├── accordion.json              # registry:block (coss-com)
└── ...
```

All accessible at `https://zaidan.carere.dev/r/kobalte/{component}.json` — no registry prefix in the URL.

### 2. Route Changes

#### New Route Files

| Old Route File | New Route File | URL |
|----------------|----------------|-----|
| `_website.ui.{-$slug}.tsx` | `_website.$registry.{-$slug}.tsx` | `/{registry}/{slug}` |
| `_website.ui.$slug.docs.tsx` | `_website.$registry.$slug.docs.tsx` | `/{registry}/{slug}/docs` |
| `preview.$primitive.$slug.tsx` | `preview.$registry.$primitive.$slug.tsx` | `/preview/{registry}/{primitive}/{slug}` |

#### Route Validation

The `$registry` param must be guarded with an allowlist to avoid colliding with `docs`, `installation`, etc. Use `beforeLoad` to validate:

```typescript
const REGISTRIES = ["shadcn", "bazza-ui", "coss-com"] as const;

// In route definition
beforeLoad: ({ params }) => {
  if (!REGISTRIES.includes(params.registry)) {
    throw notFound();
  }
}
```

#### Route Loader Logic

The route loader resolves the correct Velite collection from the `$registry` param:

```typescript
import { shadcn, bazzaUi, cossCom } from "@velite";

const collections = {
  shadcn,
  "bazza-ui": bazzaUi,
  "coss-com": cossCom,
} as const;

// In loader
const collection = collections[params.registry];
const item = collection.find(c => c.slug === params.slug) ?? collection[0]; // default to first item
```

### 3. Velite Configuration

#### Current

```typescript
const docs = defineCollection({ /* ... */ pattern: "docs/**/*.mdx" });
const ui = defineCollection({ /* ... */ pattern: "ui/**/*.mdx" });
```

#### Proposed

One collection per registry:

```typescript
const docs = defineCollection({ /* ... */ pattern: "docs/**/*.mdx" });
const shadcn = defineCollection({ /* ... */ pattern: "shadcn/**/*.mdx" });
const bazzaUi = defineCollection({ /* ... */ pattern: "bazza-ui/**/*.mdx" });
const cossCom = defineCollection({ /* ... */ pattern: "coss-com/**/*.mdx" });
```

Each collection uses the same schema (slug, title, description, toc) as the current `ui` collection.

### 4. Navigation / Sidebar

#### Current Sections

```
Getting Started
  ├── Home
  └── Installation
UI
  ├── Accordion
  ├── Button
  └── ... (alphabetical)
```

#### Proposed Sections

```
Getting Started
  ├── Home
  └── Installation
Shadcn
  ├── Accordion
  ├── Button
  └── ...
Bazza UI
  ├── Data Table Picker
  └── ...
Coss Com
  ├── Accordion
  └── ...
```

#### Files to Update

| File | Change |
|------|--------|
| `src/components/item-explorer.tsx` | Add section per registry, use `$registry` route param for links |
| `src/components/item-picker.tsx` | Search across all registry collections, show registry name per result |
| `src/components/page-toggle-nav.tsx` | Use `$registry` param instead of hardcoded `/ui/` |
| `src/components/not-found-page.tsx` | Registry-aware 404 navigation |
| `src/components/random-button.tsx` | Pick from the current registry's collection |
| `src/pages/docs/home.mdx` | Update hardcoded `/ui/accordion` → `/shadcn/accordion` |

### 5. Preview System

#### Current

```
/preview/$primitive/$slug
→ imports ../registry/${primitive}/examples/${slug}-example.tsx
```

#### Proposed

```
/preview/$registry/$primitive/$slug
```

Import resolution based on registry:

```typescript
// shadcn — existing UI components
`../registry/${primitive}/examples/shadcn/${slug}-example.tsx`

// bazza-ui, coss-com — block registries
`../registry/${primitive}/examples/${registry}/${slug}-example.tsx`
```

All examples follow the same pattern regardless of registry, since examples are grouped by registry name under the examples folder.

### 6. Registry Build

#### Single Build Per Primitive

Since all items (UI + blocks) live in one `registry.json` per primitive, only one build command is needed:

```json
{
  "r:build:kobalte": "shadcn build src/registry/kobalte/registry.json --output public/r/kobalte"
}
```

No additional build scripts needed. Adding a new block to a registry simply means adding a `registry:block` item to the existing `registry.json`.

### 7. Old URL Redirects

| Old URL | New URL |
|---------|---------|
| `/ui/{slug}` | `/shadcn/{slug}` |
| `/ui/{slug}/docs` | `/shadcn/{slug}/docs` |

#### Implementation

**Option A: TanStack Router compatibility route**

Keep `_website.ui.{-$slug}.tsx` as a thin redirect:
```typescript
beforeLoad: ({ params, search }) => {
  throw redirect({ to: "/$registry/{-$slug}", params: { registry: "shadcn", slug: params.slug }, search });
}
```

**Option B: Cloudflare `_redirects`**

```
/ui/*  /shadcn/:splat  301
```

**Recommended**: Both — Router redirect for SPA navigation, `_redirects` for direct URL hits.

### 8. Default Components Per Registry

When a user navigates to `/<registry>/` with no slug, default to the **first item** in the respective Velite collection (sorted alphabetically by title).

```typescript
const item = collection.find(c => c.slug === params.slug) ?? collection[0];
```

---

## Hardcoded References Checklist

All `/ui/` references that must be updated:

- [ ] `src/components/item-explorer.tsx` — sidebar links
- [ ] `src/components/item-picker.tsx` — command palette links
- [ ] `src/components/page-toggle-nav.tsx` — preview/docs toggle
- [ ] `src/components/not-found-page.tsx` — 404 navigation
- [ ] `src/components/random-button.tsx` — random component button
- [ ] `src/pages/docs/home.mdx` — `/ui/accordion` → `/shadcn/accordion`
- [ ] `src/routes/_website.ui.{-$slug}.tsx` — rename + update SEO metadata
- [ ] `src/routes/_website.ui.$slug.docs.tsx` — rename + update SEO metadata
- [ ] `src/routes/preview.$primitive.$slug.tsx` — rename + update import logic
- [ ] `src/routeTree.gen.ts` — regenerate after route renames
- [ ] `velite.config.ts` — add new collections, rename `ui` → `shadcn`

---

## Implementation Priority

### Phase 1 — Core Infrastructure
1. Update `velite.config.ts` — add one collection per registry, rename `ui` → `shadcn`
2. Rename `src/pages/ui/` → `src/pages/shadcn/`
3. Rename route files from `_website.ui.*` → `_website.$registry.*`
4. Add `$registry` route param with allowlist guard
5. Update route loaders to resolve collection from `$registry` param
6. Regenerate `routeTree.gen.ts`

### Phase 2 — Navigation & UI
7. Update `item-explorer.tsx` — sections per registry
8. Update `item-picker.tsx` — multi-registry search
9. Update `page-toggle-nav.tsx` — use `$registry` param
10. Update `not-found-page.tsx` — registry-aware 404
11. Update `random-button.tsx` — pick from current registry
12. Update `home.mdx` — fix hardcoded `/ui/` link

### Phase 3 — Registry & Preview
13. Restructure examples: `src/registry/<primitive>/examples/<registry-name>/`
14. Move existing examples into `examples/shadcn/`
15. Update preview route to `preview.$registry.$primitive.$slug.tsx`
16. Update preview import resolution for registry-based paths
17. Add block folder structure: `src/registry/<primitive>/blocks/<registry-name>/`

### Phase 4 — Polish
18. Add old URL redirects (`/ui/*` → `/shadcn/*`)
19. Update default component logic (first item in collection)
20. Verify registry build output is flat and accessible
21. Test CLI installation with `shadcn@latest add` for both UI and block items

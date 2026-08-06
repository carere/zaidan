---
name: shadcn-to-zaidan
description: Port and sync shadcn-style React components, blocks, examples, and documentation into Zaidan. Use when importing from shadcn/ui or an external shadcn-compatible registry, transforming React sources to SolidJS, choosing Zaidan registry targets, updating styles or registry metadata, planning a release sync, or validating a port inside the Zaidan repository.
---

# Shadcn to Zaidan

Use this skill as the workflow contract for porting shadcn-style React
components, examples, docs, and blocks into Zaidan. Use
`.agents/skills/react-to-solid/SKILL.md` for React-to-SolidJS syntax and
primitive translation rules.

Use `.agents/skills/zaidan/SKILL.md` instead for consumer-side installation,
adding published registry items, or choosing components for a SolidJS product.

## Inputs

Accept any mix of:

- Component names, such as `dialog`, `button`, or `data-table`
- Raw source URLs
- External shadcn-style registry URLs
- Source, playground, docs, or example URLs
- Filter patterns when syncing from a registry
- Dry-run requests that should report resolved work without editing
- Extra transformation guidance from the user

## Repository Sync Policy

For a full shadcn sync in this repository, use these defaults unless the user
explicitly overrides them:

- Resolve the latest stable `shadcn` npm release, then pin the entire sync
  to its immutable `shadcn@<version>` Git tag and peeled commit. Never mix a
  release snapshot with moving `main` URLs.
- Use the current Base UI catalog and API under `registry/bases/base` as the
  upstream source of truth. Existing Zaidan APIs do not constrain the port.
- Implement primitives in this order: Kobalte equivalent, then Corvu
  equivalent, then vanilla SolidJS. For non-primitive React dependencies,
  search for a maintained SolidJS flavor before writing an adapter.
- Port installable components, every demo referenced by their MDX, and
  their Create examples.
- Exclude Form, Data Table, Date Picker, and Typography as installable sync
  targets. Zaidan handles those concerns separately.
- Replace Sonner with the Base Toast surface implemented on Kobalte Toast. Do
  not keep a Sonner alias, redirect, registry item, generated artifact, or
  `solid-sonner` dependency.
- Keep one Sidebar component. Do not create separate documentation surfaces
  for its floating, icon, or inset variants.
- Treat Accordion, Card, and Resizable documentation content as complete.
  When their sources or examples change, perform only a reference-integrity
  pass for preview/source names and any line-based code excerpts.

Resolve a stable release before fetching sources. Record the version, tag, and
peeled commit in every plan or report. A typical resolution is:

```bash
curl -s https://registry.npmjs.org/shadcn/latest
git ls-remote --tags https://github.com/shadcn-ui/ui.git \
  "refs/tags/shadcn@<version>*"
```

Use the peeled `^{}` commit when an annotated tag returns two refs.

URL templates may contain `<name>` or `{component}` placeholders. Replace them
with the source component name before fetching.

## Workflow

When asked to port a component:

1. Determine whether the source is a release-pinned shadcn item, a raw source
   URL, or an external shadcn-style registry/component.
2. For a full sync, inventory the pinned catalog before changing files. Classify
   every surface as missing, stale, current, replacement, composition/guide, or
   excluded. Diff existing Zaidan sources as well as missing ones.
3. Resolve registry metadata, component source, MDX, MDX-referenced demos, and
   Create example as distinct upstream artifacts. Inspect actual imports;
   registry metadata alone is not a reliable dependency graph.
4. Get a live URL for the original React component when available, then inspect
   it with a browser to understand behavior, states, keyboard interactions,
   responsive behavior, and edge cases.
5. Transform the component, docs, and examples with help from the
   `react-to-solid` skill.
6. Update all eight style slices affected by the component. Start from the
   upstream semantic style classes, then verify selectors, data attributes, and
   CSS variables against the actual Kobalte/Corvu/Solid DOM.
7. Run the transformed component, focused docs demos, and Create gallery
   locally and test each applicable artifact with a browser.
8. If running inside this Zaidan repo, update
   `src/registry/kobalte/registry.json`.
9. Validate with focused checks and broader checks when appropriate.

Use judgment for the details. This workflow covers new ports and release syncs
of existing registry items, especially when changes touch docs, examples,
styles, registry metadata, or browser behavior. Split independent work across
subagents with clear prompts when that helps.

## Shadcn Sources

Use the pinned release tag or commit in place of `<ref>`. Do not substitute
`main` during a release sync.

| Need | Location |
| --- | --- |
| Registry metadata | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/registry/bases/base/ui/_registry.ts` |
| UI component source | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/registry/bases/base/ui/<name>.tsx` |
| Create metadata | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/registry/bases/base/examples/_registry.ts` |
| Create example | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/registry/bases/base/examples/<name>-example.tsx` |
| UI docs source | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/content/docs/components/base/<name>.mdx` |
| Docs demo | `https://raw.githubusercontent.com/shadcn-ui/ui/<ref>/apps/v4/examples/base/<preview-name>.tsx` |
| Playground URL | `https://ui.shadcn.com/create?item=<name>-example` |

Use `curl -s` for raw file fetches.

## External Sources

For external shadcn-style registries, prefer explicit inputs from the user:

- Registry URL or source file URL
- Playground or documentation URL where the React original can be observed
- Docs URL or template, if docs should be synced into Zaidan
- Example URL or template, if examples should be synced into Zaidan

Prefix external target names only when needed to avoid collisions.

## Zaidan Targets

The active registry namespace is `kobalte`.

| Output kind | Target |
| --- | --- |
| UI component | `src/registry/kobalte/ui/<name>.tsx` |
| Create example | `src/registry/kobalte/examples/ui/<name>-example.tsx` |
| Focused docs demo | `src/registry/kobalte/examples/docs/<preview-name>.tsx` |
| Block files | `src/registry/kobalte/blocks/<name>/` |
| Block example | `src/registry/kobalte/examples/blocks/<name>-example.tsx` |
| Hook | `src/registry/kobalte/hooks/<name>.ts` |
| Shared registry component | `src/registry/kobalte/components/<name>.tsx` |
| UI docs | `src/pages/ui/kobalte/<name>.mdx` |
| Block docs | `src/pages/blocks/kobalte/<name>.mdx` |
| Registry manifest | `src/registry/kobalte/registry.json` |
| Registry styles | `src/registry/kobalte/styles/` |

Read nearby files before writing and match local conventions.

Focused docs demos are default-export modules. `<ComponentPreview name="x" />`
must resolve the same `examples/docs/x.tsx` module at runtime and when injecting
displayed source. Keep slugs aligned across MDX frontmatter, UI source,
registry item, and Create example.

## Style Sync

The global style sync must:

- add/update all eight `src/registry/kobalte/styles/style-*.css` files;
- unwrap upstream `.style-*` containers and translate semantic `.cn-*` classes
  to `.z-*` classes;
- remove React Aria-only rules when they do not apply;
- map Base UI attributes and CSS variables using the React-to-Solid reference,
  then verify the real rendered primitive DOM because the reference is not
  exhaustive;
- wire new styles through schemas, configuration, the Create customizer,
  `src/styles.css`, registry metadata, customization docs, tests, and generated
  artifacts;
- port the complete radius/token model required by the pinned styles, including
  larger computed radii, and keep any radius/customizer UI in sync;
- preserve harmless unmatched style sections, but never
  preserve selectors known to target an obsolete primitive DOM.

For Create parity, update the generic `preview-02`/`preview` showcase and
picker/discovery rules while keeping `component-example` and the excluded
Sidebar variants out of the catalog.

## Toast Replacement

Treat Toast as a hard replacement of Sonner:

- Add the pinned shadcn Base Toast public surface over Kobalte Toast, its
  registry item, styles, and focused primitive validation.
- Replace Sonner documentation with Toast documentation and focused demos.
- Replace the Sonner Create gallery and validate the Create iframe.
- Migrate remaining source and documentation callers, ensure every emitting
  context mounts a Region/List host, remove all Sonner artifacts and
  `solid-sonner` from the manifest and lockfile, rebuild generated output, and
  check for stale references.

Validate default, description, variants, close, timeout pause, keyboard hotkey,
swipe, promise/update/dismiss, reduced motion, light/dark, and Create iframe
behavior.

## Block Composition

For blocks, keep the installable surface as small as the public primitive
requires. If a block grows beyond a single file, split it into
`src/registry/kobalte/blocks/<name>/` and export from `index.tsx`.

- Put only reusable primitives, context, helpers, and types inside the block.
- Put dialogs, upload controls, previews, actions, and product-specific layout
  in `src/registry/kobalte/examples/blocks/<name>-example.tsx`.
- Keep docs snippets aligned with the exported primitive API, not incidental
  example composition.
- When changing interaction behavior, verify the real preview in a browser.

## Registry Updates

When updating `src/registry/kobalte/registry.json`, infer fields from the files:

- `dependencies`: npm packages imported by the item.
- `registryDependencies`: other Zaidan registry items used by the item. Match
  the URL style already present in the registry.
- `files`: real paths under `src/registry/kobalte/`.

For folder-based blocks, list every internal file the block imports. Do not add
example-only files to the installable registry item unless the example is meant
to be installed. Keep entries ordered consistently with the existing manifest.

## Validation

Use focused checks while iterating:

```bash
bun biome check --write <changed-files>
moon run :check
moon run :tsc
moon run :r-validate-kobalte
moon run :build
```

Run `moon run :r-build-kobalte` when publishable registry files, registry
styles, or `src/registry/kobalte/registry.json` change. Explicitly check for
stale generated item JSON after a hard replacement such as Sonner to Toast;
the build may not delete obsolete output by itself.

Search changed TSX files for React leftovers:

```bash
rg 'className|forwardRef|from "react"|from "lucide-react"|React\.|useState|useEffect|useMemo|useCallback' <changed-files>
```

Use `bunx` instead of `npx`.

## Report

End with:

- Source type and exact release version/tag/commit, raw URL, or external registry
- Source, playground, docs, referenced demos, and Create examples used
- Files changed
- Browser checks performed
- Validation commands run
- Registry changes
- Style changes across all eight themes
- Intentional exclusions or parity exceptions
- Remaining follow-ups

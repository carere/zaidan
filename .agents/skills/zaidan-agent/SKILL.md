---
name: zaidan-agent
description: Workflow for porting shadcn-style React components to SolidJS. Use when syncing or porting components from shadcn or external shadcn-style registries, resolving React source/playground/docs/examples, choosing Zaidan target paths, testing the transformed component, or updating the Zaidan registry.
---

# Zaidan Agent

Use this skill as the workflow contract for porting shadcn-style React
components, examples, docs, and blocks into Zaidan. Use
`.agents/skills/react-to-solid/SKILL.md` for React-to-SolidJS syntax and
primitive translation rules.

## Inputs

Accept any mix of:

- Component names, such as `dialog`, `button`, or `data-table`
- Raw source URLs
- External shadcn-style registry URLs
- Source, playground, docs, or example URLs
- Filter patterns when syncing from a registry
- Dry-run requests that should report resolved work without editing
- Extra transformation guidance from the user

URL templates may contain `<name>` or `{component}` placeholders. Replace them
with the source component name before fetching.

## Workflow

When asked to port a component:

1. Determine whether the source is built-in shadcn, a raw source URL, or an
   external shadcn-style registry/component.
2. Resolve the React source from the component name, URL, or registry metadata.
3. Get a live URL for the original React component when available, then inspect
   it with a browser to understand behavior, states, keyboard interactions,
   responsive behavior, and edge cases.
4. If running inside this Zaidan repo, also fetch docs and examples so the
   component can be added to the registry site.
5. Transform the component, docs, and examples with help from the
   `react-to-solid` skill.
6. Run the transformed component locally and test it with a browser.
7. If running inside this Zaidan repo, update
   `src/registry/kobalte/registry.json`.
8. Validate with focused checks and broader checks when appropriate.

Use judgment for the details. This workflow also covers meaningful refinements
to existing registry items, especially when the change touches docs, examples,
registry metadata, or browser behavior. Split independent work across subagents
with clear prompts when that helps.

## Shadcn Sources

Use these defaults when the user gives a shadcn component name and no custom
source.

| Need | Location |
| --- | --- |
| Registry metadata | `https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/_registry.ts` |
| UI component source | `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/ui/<name>.tsx` |
| UI example source | `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/bases/base/examples/<name>-example.tsx` |
| UI docs source | `https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/content/docs/components/<name>.mdx` |
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
| UI example | `src/registry/kobalte/examples/ui/<name>-example.tsx` |
| Block files | `src/registry/kobalte/blocks/<name>/` |
| Block example | `src/registry/kobalte/examples/blocks/<name>-example.tsx` |
| Hook | `src/registry/kobalte/hooks/<name>.ts` |
| Shared registry component | `src/registry/kobalte/components/<name>.tsx` |
| UI docs | `src/pages/ui/kobalte/<name>.mdx` |
| Block docs | `src/pages/blocks/kobalte/<name>.mdx` |
| Registry manifest | `src/registry/kobalte/registry.json` |
| Registry styles | `src/registry/kobalte/styles/` |

Read nearby files before writing and match local conventions.

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
bun run compile
bun run r:validate:kobalte
bun run r:build:kobalte
```

Run the registry build when publishable registry files or
`src/registry/kobalte/registry.json` changed.

Search changed TSX files for React leftovers:

```bash
rg 'className|forwardRef|from "react"|from "lucide-react"|React\.|useState|useEffect|useMemo|useCallback' <changed-files>
```

Use `bunx` instead of `npx`.

## Report

End with:

- Source type: shadcn, raw URL, or external registry
- Source, playground, docs, and examples used
- Files changed
- Browser checks performed
- Validation commands run
- Registry changes
- Remaining follow-ups

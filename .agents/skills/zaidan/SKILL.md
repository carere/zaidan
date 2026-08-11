---
name: zaidan
description: Install and configure the Zaidan component registry in an existing SolidJS codebase, and recommend Zaidan components for a product or interaction need. Use when setting up Zaidan, adding Zaidan components, fixing consumer-side registry configuration, or deciding which Zaidan components to compose for a SolidJS interface.
---

# Zaidan

Use this skill for consumer-side work in a SolidJS application. Treat Zaidan as
a source-code registry: configure the project, select suitable components, add
them with the registry CLI, and verify the resulting SolidJS code.

Use `shadcn-to-zaidan` instead when the task is to import, sync, transform, or
maintain a shadcn-style React component inside the Zaidan registry.

## Load References

- Read `references/installation.md` before installing, configuring, adding, or
  troubleshooting Zaidan in a project.
- Read `references/component-selection.md` when recommending components or
  deciding how to compose a requested interface.

## What the Registry Holds

One `@zaidan` registry serves several kinds of item. Knowing which kind a name
is tells you what the CLI will write.

| Kind | Names | What lands in the project |
| --- | --- | --- |
| Components | `button`, `dialog`, `sidebar`, … | Source files under the `ui` alias |
| Blocks | `sortable`, `image-crop`, `message-scroller`, `questionnaire`, and the chart examples (`chart-bar-default`, `chart-line-interactive`, …) | Larger compositions plus the components they use |
| Hook | `use-mobile` | Source file under the `hooks` alias |
| Shared component | `color-mode` | Source file under the `components` alias |
| Styles | `style-vega`, `style-nova`, `style-maia`, `style-lyra`, `style-mira`, `style-luma`, `style-sera`, `style-rhea` | `styles/base.css` and `styles/utilities.css`, plus their imports |
| Base colors and themes | `neutral`, `stone`, `zinc`, `gray`, `mauve`, `olive`, `mist`, `taupe`; `blue`, `green`, … | Light and dark CSS variables |
| Chart palettes | `chart-blue`, `chart-neutral`, … | `chart-1` … `chart-5` only |
| Radius | `radius-none`, `radius-small`, `radius-medium`, `radius-large` | `--radius` |
| Fonts | `font-inter`, `font-geist-mono`, … | The face, wired to `--font-sans`, `--font-serif`, or `--font-mono` |
| Typeset | `typeset` | `styles/typeset.css` and its import |

Two items are generated from a code rather than listed in the registry:

- `@zaidan/preset-<code>` — a whole design system (style, base color, theme,
  chart palette, fonts, radius, menu accent) from a code produced by
  `https://zaidan.carere.dev/create`.
- `@zaidan/typeset-<code>` — the typeset stylesheet, the fonts a design uses,
  and its `.typeset-<item>` preset class, from a code produced by
  `https://zaidan.carere.dev/typeset`.

Both resolve over the CLI even though no listing entry exists for them. Prefer
a preset over a hand-assembled list of style, color, radius, and font items
when the user wants a full design system.

## Workflow

1. Inspect `package.json`, the lockfile, framework configuration, TypeScript
   aliases, global CSS, and `components.json` when present. Identify the SolidJS
   framework, package manager, Tailwind version, existing aliases, and current
   Zaidan style before editing.
2. Translate the user's request into interaction needs. Recommend the smallest
   useful component set and explain the role of each component. Distinguish
   alternatives such as `select` versus `combobox`, `dialog` versus
   `alert-dialog`, and `sheet` versus `drawer`.
3. Verify recommended item names against the current registry before presenting
   an install command. In this repository, inspect
   `src/registry/kobalte/registry.json`; elsewhere, resolve the corresponding
   `https://zaidan.carere.dev/r/kobalte/<name>.json` item. `@zaidan/preset-<code>`
   and `@zaidan/typeset-<code>` are the exception: they are generated on demand
   from the code, so they resolve without appearing in the registry listing.
4. Configure only missing prerequisites. Preserve the project's package
   manager, framework conventions, aliases, CSS entry point, theme choices, and
   existing `components.json` values.
5. Add the selected components through the configured `@zaidan` registry. Let
   registry metadata install transitive Zaidan items and npm dependencies.
6. Inspect the generated files and imports. Adapt the user's application only
   when requested; installing components alone does not imply building a
   feature with them.
7. Run the smallest relevant formatting, typecheck, or build command available
   in the target project. Report the configuration changed, components added,
   commands run, and any remaining integration work.

## Recommendation Standard

Base recommendations on behavior, not visual resemblance alone. Account for:

- the information or action the interface must expose;
- whether content is persistent, contextual, modal, or transient;
- keyboard, focus, dismissal, and validation behavior;
- data size, search needs, touch use, and responsive layout;
- existing components already installed in the project.

Lead with one recommended composition. Mention an alternative only when a real
product decision changes the choice. State when Zaidan supplies primitives but
the requested product pattern still needs application-owned state, data
loading, validation, or layout.

## Boundaries

- Keep generated components as editable application source; do not add a
  runtime `zaidan` package.
- Use SolidJS imports and syntax in consumer examples.
- Prefer the registry CLI over copying source files by hand.
- Keep registry-authoring, React-to-Solid transformation, release syncing,
  Zaidan documentation, and registry manifest maintenance in
  `shadcn-to-zaidan`.

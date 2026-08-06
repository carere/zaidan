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
   `https://zaidan.carere.dev/r/kobalte/<name>.json` item.
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

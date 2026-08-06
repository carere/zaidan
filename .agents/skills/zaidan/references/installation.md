# Installing Zaidan

Use this reference for an existing SolidJS application. Zaidan is a component
registry consumed through the shadcn CLI; it is not an npm runtime package.

## Prerequisites

Verify before changing the project:

- SolidJS is the UI runtime.
- Tailwind CSS v4 is configured and imported by the application's global CSS.
- The project has a working `@/*` alias, or an equivalent alias that can be
  preserved in `components.json`.
- The detected package manager is used for every install and CLI command.

If a prerequisite is missing, follow the matching project guide rather than
replacing the framework's configuration wholesale:

- Vite: `https://zaidan.carere.dev/docs/installation/vite`
- Astro with SolidJS: `https://zaidan.carere.dev/docs/installation/astro`
- SolidStart: `https://zaidan.carere.dev/docs/installation/solid-start`
- TanStack Router: `https://zaidan.carere.dev/docs/installation/tanstack-router`
- TanStack Start: `https://zaidan.carere.dev/docs/installation/tanstack-start`
- Manual setup: `https://zaidan.carere.dev/docs/installation/manual`

## CLI Runner

Derive the runner from the lockfile:

| Lockfile | Runner prefix |
| --- | --- |
| `bun.lock` or `bun.lockb` | `bunx --bun shadcn@latest` |
| `pnpm-lock.yaml` | `pnpm dlx shadcn@latest` |
| `yarn.lock` | `yarn dlx shadcn@latest` |
| `package-lock.json` | `npx shadcn@latest` |

Use the repository's declared package manager when it conflicts with the
lockfile. Show the concrete runner in commands; do not leave a placeholder.

## Configure the Registry

When `components.json` is absent, run `<runner> init`, review the generated
aliases and CSS path, then configure Zaidan. When it exists, edit it in place.

Preserve all existing settings and ensure these values are present:

```json
{
  "style": "kobalte",
  "registries": {
    "@zaidan": "https://zaidan.carere.dev/r/{style}/{name}.json"
  }
}
```

Do not replace the full file with this fragment. Preserve `tailwind`,
`aliases`, `iconLibrary`, base color, CSS variables, and menu settings. If an
existing non-Zaidan shadcn style is in active use, surface the style change and
its generated-code implications before overwriting it.

## Add Components

Add verified items with:

```text
<runner> add @zaidan/<name>
```

Add multiple independently requested items in one command when the CLI accepts
them. Trust registry metadata for transitive Zaidan dependencies, then inspect
the output rather than assuming every requested file was written directly.

## Verify

Check that:

1. `components.json` resolves `{style}` to `kobalte` and retains valid aliases.
2. Generated component files landed under the configured `ui` or component
   alias.
3. New npm dependencies use SolidJS packages and the detected package manager.
4. Generated TSX contains no React imports or React-only syntax.
5. The target project's formatter and typecheck pass; run its build when setup
   or shared configuration changed.

For a registry 404, verify the exact item name and fetch
`https://zaidan.carere.dev/r/kobalte/<name>.json`. For an alias failure, align
TypeScript and bundler aliases before rerunning the CLI. For missing styles,
verify Tailwind v4 scans the generated source and the configured global CSS is
loaded by the application.

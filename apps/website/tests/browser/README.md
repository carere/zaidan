# Rendered component regression tests

From the repository root, install workspace dependencies and Chromium, then run
browser checks through Moon:

```sh
bun install
bun --cwd apps/website playwright install chromium
direnv exec "$(git rev-parse --show-toplevel)" moon run zaidan:test-browser
```

Playwright starts and stops a local Vite fixture server on port 5174. Run the
focused Playwright commands below from `apps/website`; fixture URLs retain their
`/tests/browser/` paths.

The Switch fixture renders the real registry component with the site's Solid, TanStack,
and Tailwind transforms and `src/styles.css`. The test matrix covers eight styles,
light/dark themes, both sizes, and controlled/uncontrolled state. Computed appearance
checks wait for CSS transitions to finish. Run a single case with, for example:

```sh
bun playwright test --grep 'vega light default uncontrolled'
```

From the repository root, run the unit suite with
`direnv exec "$(git rev-parse --show-toplevel)" moon run zaidan:test`.

The Filters fixture at `/tests/browser/filters.html` uses the same transforms and
renders the real registry component and demo. Run it with
`bun playwright test tests/browser/filters.spec.ts`. Its hover regression rests
the browser pointer on an option for over one second because Kobalte's delayed
dismissal can pass an immediate visibility check.

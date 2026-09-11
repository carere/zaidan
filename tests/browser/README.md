# Rendered component regression tests

Install dependencies with `bun install` and Chromium with `bun playwright install chromium`.
Run `bun playwright test` (or `bun moon run :test-browser`). Playwright starts and stops
a local Vite fixture server on port 5174.

The Switch fixture renders the real registry component with the site's Solid, TanStack,
and Tailwind transforms and `src/styles.css`. The test matrix covers eight styles,
light/dark themes, both sizes, and controlled/uncontrolled state. Computed appearance
checks wait for CSS transitions to finish. Run a single case with, for example:

```sh
bun playwright test --grep 'vega light default uncontrolled'
```

The Node-based suite remains available through `bun vitest run`.

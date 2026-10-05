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

The Filters fixture at `/tests/browser/filters.html` uses the same transforms and
renders the real registry component and demo. Run it with
`bun playwright test tests/browser/filters.spec.ts`. Its hover regression rests
the browser pointer on an option for over one second because Kobalte's delayed
dismissal can pass an immediate visibility check.

The Radio Group fixture at `/tests/browser/radio-group.html` renders the real docs
demo and choice cards, plus controlled/uncontrolled form cases. Run it with
`bun playwright test tests/browser/radio-group.spec.ts`. It covers circle and label
clicks in all eight styles and both themes, selection stability, disabled/read-only
states, keyboard navigation, input focus, and native form submission.

The Data Grid fixture at `/tests/browser/data-grid.html` renders the first docs demo.
Run `bun playwright test tests/browser/data-grid.spec.ts` in Chromium 144+ to check
wheel and emulated touch page scrolling, horizontal edge containment, and internal
vertical scrolling with chaining at both boundaries of a constrained-height grid.
Touch input uses Chromium's CDP gesture emulation; physical touch devices and browser
history gestures are not covered.

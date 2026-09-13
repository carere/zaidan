# Issue #509: consumer semantic colors

The audit covered all eight `style-*.css` files and shared registry utilities.
The missing color dependencies were `success`, `warning`, `info`, and their
three foregrounds. Other color references resolve through the standard base
and accent themes, sidebar/chart tokens, or Tailwind's built-in palette
(including black, white, transparent, currentColor and inherit).
No additional color tokens were needed.

`semantic-colors` supplies the existing website's light/dark values and explicit
Tailwind mappings. Every style depends on it, including styles installed through
a preset. The theme builder supplies the same semantic defaults before applying
base/accent/chart/radius/menu choices. These remain ordinary editable CSS variables.

## Verification

- The consumer CSS regression failed for all 16 style/path combinations before
  the fix: seven styles reported `border-success-foreground/15`, while Sera
  reported `text-success-foreground`.
- After the fix, all eight styles pass Vite development CSS transforms and
  production builds through both style/theme and preset dependency closures.
  Fixtures use registry files and theme data without importing `src/styles.css`.
- A fresh `create-vite` Solid/TypeScript app with the documented Vite/Tailwind
  configuration and standard shadcn initialization CSS received generated local
  registry items through the real shadcn CLI. Added Vega, Geist, Button, Alert
  and Badge, then installed a generated Sera preset. Both installations built.
  The fixture used local registry URLs because the fix is not published.
- The in-app browser verified success/warning/info light and outline Badge
  variants in light and dark modes for the CLI-installed app and after the
  preset installation. The expected green, amber and blue colors were visible.
- Regression assertions cover semantic values in every theme and preset output,
  plus a zinc/blue/amber configuration with large radius and bold menu accent.

The full suite passed (61 files, 120 tests), along with typechecking, the full
Biome check, registry validation/generation, and the site production build
(88 prerendered pages). The consumer also passed its TypeScript/build script.

Consumer verification used Vite 8.3.0, Tailwind CSS and its Vite plugin 4.3.3,
Solid 1.9.15 and shadcn 4.16.1. The automated CSS regression uses the repository's
installed Vite 8.2.0 and Tailwind CSS 4.3.3.

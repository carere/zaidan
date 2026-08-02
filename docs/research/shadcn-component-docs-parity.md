# Shadcn component-docs parity: Accordion, Resizable, and Card

Research baseline: Zaidan `0938ceb4892efb098bacc6b6aa569d9ba57a1a01`; shadcn/ui `cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4` (2026-07-31); Fumadocs `fumadocs-mdx@15.0.12` (`7974b8655bdb14d91792b9382186afbabe37a00b`), the version pinned by shadcn.

## Recommendation

Keep Zaidan's Velite + Solid MDX pipeline. Add the small amount of app-specific machinery needed for component demos and source display; do **not** migrate to Fumadocs just to reproduce shadcn's component pages.

The most maintainable implementation is:

1. make each documentation demo an individually importable TSX module;
2. resolve those modules at build time and inject their raw source into MDX;
3. resolve the same names at runtime through a Vite `import.meta.glob` map;
4. add Solid `ComponentPreview`, `ComponentSource`, and `CodeTabs` MDX components;
5. move the page title, description, and semantic foundation strip into the route shell;
6. rewrite only Accordion, Resizable, and Card with the section order below, omitting RTL.

This preserves the existing package-manager transforms, code-import convention, Expressive Code themes, and TOC generation while creating the seam required to scale to the remaining components.

## What shadcn and Fumadocs each provide

Shadcn pins `fumadocs-mdx` 15.0.12, but replaces Fumadocs' default code highlighter: its `source.config.ts` removes the first default rehype plugin and appends `rehype-pretty-code` with custom themes and transformers ([shadcn source config](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/source.config.ts#L1-L24), [pinned versions](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/package.json#L65-L68)).

At the pinned Fumadocs tag, the default preset assembles `remarkGfm`, headings, image imports, code tabs, npm/package-manager transforms, user remark plugins, and structured-data extraction; its rehype side assembles code highlighting, user plugins, and TOC extraction ([Fumadocs 15.0.12 preset](https://github.com/fuma-nama/fumadocs/blob/7974b8655bdb14d91792b9382186afbabe37a00b/packages/mdx/src/config/preset.ts#L68-L123)). The current Fumadocs checkout (`7db1d651a77f342065f29c60979b38508ab16912`) has the same preset assembly, so there is no material upstream change affecting this decision ([current preset](https://github.com/fuma-nama/fumadocs/blob/7db1d651a77f342065f29c60979b38508ab16912/packages/mdx/src/config/preset.ts#L68-L123)).

Crucially, Fumadocs does **not** provide shadcn's component preview or component-source resolver. Those are shadcn application components: `ComponentPreview` calls its registry resolver and combines the live component with full and three-line source views ([preview](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/component-preview.tsx#L69-L109)); `ComponentSource` reads demo/registry files, formats them, highlights them, and wraps them in the collapsible UI ([source](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/component-source.tsx#L34-L84)); the registry resolver is also app-owned ([registry](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/lib/registry.ts#L24-L115)). Shadcn keeps each demo as a separately indexed file, which is the key architectural pattern to copy, not Fumadocs itself.

Zaidan already has equivalents for most Fumadocs defaults: Velite supplies metadata/TOC, the custom Vite MDX compiler assembles remark/rehype plugins, package-manager tabs are already transformed, code imports are supported, and Expressive Code handles highlighting ([Velite schema](../../velite.config.ts), [MDX compiler](../../src/lib/vite-plugins/mdx.ts), [code-import plugin](../../src/lib/remark-plugins/code-import.ts)). Replacing these would create migration work without supplying the missing preview/source feature.

## Page shell and foundation identity

Shadcn renders title/description outside MDX, wraps prose in its `typeset` stylesheet, and inserts `DocsBaseSwitcher` immediately before the MDX body on component pages ([page shell](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/app/%28app%29/docs/%5B%5B...slug%5D%5D/page.tsx#L89-L156)). The switcher displays the active base's configured logo ([switcher](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/docs-base-switcher.tsx#L7-L48), [base metadata](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/registry/bases.ts#L4-L38)).

For Zaidan, model this as semantic `foundation` metadata, not as a reflection of every package in `dependencies`:

| Component | Foundation shown | Reason |
| --- | --- | --- |
| Accordion | Kobalte | Its primitives are runtime imports from `@kobalte/core` ([source](../../src/registry/kobalte/ui/accordion.tsx)). |
| Resizable | Corvu | Its runtime primitives come from `@corvu/resizable`; the Kobalte polymorphic import is type-only ([source](../../src/registry/kobalte/ui/resizable.tsx)). The install command must still include both packages. |
| Card | none | It is native Solid/div composition with no primitive foundation ([source](../../src/registry/kobalte/ui/card.tsx)). Showing a Kobalte logo merely because the route is under the Kobalte registry would be misleading. |

Extend the Velite `ui` schema with `foundation: s.enum(["kobalte", "corvu"]).optional()` and, if the API-reference component should be data-driven, optional `links.doc`/`links.api`. Pass the full document record to a component-docs shell. That shell should render title, description, a same-position foundation row when `foundation` exists, then MDX. Card should omit the logo/label; it may retain an empty equal-height spacer only if visual rhythm requires it.

The historical Kobalte icon can be restored verbatim from parent commit `4ef7abe008b1073ff7674965db3e7a875541911a` ([historical file](https://github.com/carere/zaidan/blob/4ef7abe008b1073ff7674965db3e7a875541911a/src/components/icons/kobalte.tsx)); its previous consumer used `size-4 fill-foreground`. The new untracked [Corvu icon](../../src/components/icons/corvu.tsx) also needs its accidental export name `Carere` changed to `Corvu`, then:

- body: `class="fill-foreground"`;
- eye and upper beak: `class="fill-background"`;
- lower beak: `class="fill-background/50"`.

## MDX/demo pipeline design

The current target example files are galleries of private functions. Split or extract their demos into convention-based, default-export modules, for example `src/registry/kobalte/examples/docs/accordion-basic.tsx`, while optionally keeping the gallery file as a composition of those exports. Match shadcn's stable demo names where practical (`accordion-demo`, `accordion-multiple`, and so on).

Add two coordinated resolvers:

- a Vite runtime map using `import.meta.glob` that maps a demo name to its Solid component;
- a remark plugin that recognizes `<ComponentPreview name="…" />` and `<ComponentSource name="…" />`, validates the name/path, reads the demo source, and injects a fenced `tsx` node as the component's child.

Run the source-injection plugin before the existing code-import/highlighting stages. The Solid preview component can render the live demo plus its compiled child source in a rounded bordered container, with shadcn's short source teaser and “View Code” expansion. `ComponentSource` uses the same injected child without the live preview. This keeps file I/O at build time, prevents arbitrary runtime paths, and lets Expressive Code continue handling syntax, copy buttons, themes, and raw text.

Register `ComponentPreview`, `ComponentSource`, `CodeTabs`, and any tab primitives in [the MDX component map](../../src/components/mdx-components.tsx). Add a dedicated persistent `CodeTabs` wrapper for the Installation “CLI / Manual” choice; the existing package-manager tabs inside command blocks should remain in place.

Use shadcn's dimensions and states as the visual reference: rounded-2xl outer border, a centered preview region, a collapsed three-line code teaser, and an expand/collapse control ([preview tabs](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/component-preview-tabs.tsx#L52-L176)). Port the relevant `typeset` rules or align the existing tag component classes rather than adopting all of `fumadocs-ui`; shadcn itself uses an application stylesheet for this typography.

## Target section matrix (RTL deliberately omitted)

Each page begins with the primary `ComponentPreview` after the shell-rendered title/description/foundation row.

| Page | Sections, in order | Adaptation notes |
| --- | --- | --- |
| Accordion | Installation; Usage; Composition; Basic; Multiple; Disabled; Borders; Card; API Reference | This exactly follows current shadcn except RTL ([source page](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/content/docs/components/radix/accordion.mdx#L18-L163)). Use Solid/Kobalte code and link to Kobalte Accordion API. |
| Resizable | About; Installation; Usage; Composition; Vertical; Handle; API Reference | These are shadcn's applicable sections excluding RTL ([source page](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/content/docs/components/radix/resizable.mdx#L17-L114)). Do not copy its `react-resizable-panels` v4 changelog: Zaidan uses Corvu. Add a changelog only when documenting an analogous Zaidan/Corvu migration. Installation needs both `@corvu/resizable` and `@kobalte/core` because the public polymorphic types require Kobalte. |
| Card | Installation; Usage; Composition; Size; Spacing; Image; API Reference; Changelog | This follows shadcn except RTL ([source page](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/content/docs/components/radix/card.mdx#L14-L204)). The Spacing section and changelog require the implementation sync below. |

## Card parity is not docs-only

Current shadcn Card uses a `--card-spacing` custom property throughout header/content/footer and changes the property for small cards. Its Spacing example and changelog describe that behavior. Zaidan's seven registry style files currently hard-code the gaps and paddings (for example [Nova](../../src/registry/kobalte/styles/style-nova.css)); therefore copying those sections now would document a feature that does not work.

For actual parity, update all seven Card style definitions to define/use `--card-spacing`, preserving each style's existing default and small spacing values, then add the spacing demo and a Zaidan-specific migration note. Rebuild the public registry artifacts afterward. If this implementation work is intentionally out of scope, omit Card's Spacing and Changelog sections and explicitly accept that the first pass is structurally short of shadcn parity.

## Implementation order

1. Add `foundation`/links to the Velite UI schema and move title/description/foundation rendering into the docs shell.
2. Restore the Kobalte icon; correct and recolor the Corvu icon; add a small foundation metadata/component map.
3. Extract the three pages' demos into individually importable files and add the runtime demo index.
4. Add the source-injection remark plugin and Solid preview/source/code-tab MDX components.
5. Sync Card spacing variables across all registry styles.
6. Rewrite the three MDX pages according to the matrix, with no RTL content.
7. Validate with `moon run :check`, `moon run :tsc`, `moon run :r-validate-kobalte`, and `moon run :build`; after registry CSS/component changes also run `moon run :r-build-kobalte`. Manually verify all three pages at desktop/mobile widths and in light/dark themes, including TOC, live demos, package-manager tabs, source copy/expand, and the absence of RTL headings.

## Main risks

- **Demo/source drift:** avoid separate hand-maintained code snippets; both live preview and displayed source must resolve the same module.
- **Foundation conflated with dependencies:** Resizable is the test case—Corvu is the semantic foundation although Kobalte remains an install/type dependency.
- **Invalid documentation:** Card spacing must ship with the CSS change or the section must be omitted.
- **Unsafe source lookup:** demo names must resolve through a generated/convention map, not arbitrary MDX-provided filesystem paths.
- **Over-migration:** adopting Fumadocs or `rehype-pretty-code` is optional visual/architecture churn, not a prerequisite for shadcn-like component docs.

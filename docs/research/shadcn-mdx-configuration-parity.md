# Shadcn MDX configuration parity

Research baseline: Zaidan `9459325d06d9e30ab86949992bade82c7cd07e86`; shadcn/ui `cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4` (current main on 2026-08-03); Fumadocs `fumadocs-mdx@15.0.12` at `7974b8655bdb14d91792b9382186afbabe37a00b`, the version shadcn pins. The current Fumadocs checkout was also checked at `7db1d651a77f342065f29c60979b38508ab16912`; it is `fumadocs-mdx@15.2.2` and retains the relevant Vite and preset architecture.

## Conclusion

**Yes, Zaidan can use the same Fumadocs MDX preset and the same `rehype-pretty-code` strategy as shadcn. There is no fundamental Vite or Solid blocker.** `fumadocs-mdx@15.0.12` publishes a first-party `fumadocs-mdx/vite` adapter, declares Vite 7/8 support, and makes React optional ([package](https://github.com/fuma-nama/fumadocs/blob/7974b8655bdb14d91792b9382186afbabe37a00b/packages/mdx/package.json), [Vite adapter](https://github.com/fuma-nama/fumadocs/blob/7974b8655bdb14d91792b9382186afbabe37a00b/packages/mdx/src/vite/index.ts)). Its compiler forwards standard `@mdx-js/mdx` options, so Zaidan can continue emitting Solid JSX with `jsx: true`, `jsxImportSource: "solid-js"`, `providerImportSource: "solid-mdx"`, and `stylePropertyNameCase: "css"` ([Fumadocs build](https://github.com/fuma-nama/fumadocs/blob/7974b8655bdb14d91792b9382186afbabe37a00b/packages/mdx/src/loaders/mdx/build-default.ts#L40-L97), [Zaidan Vite config](../../vite.config.ts)).

However, **shadcn's `source.config.ts` cannot be copied literally and expected to preserve Zaidan's current behavior**. Shadcn uses Fumadocs as both content source and compiler through a Next.js adapter, emits React MDX, and implements component source/preview rendering in React server/application components. Zaidan uses Velite for collections/TOCs, a Solid MDX provider, custom content syntax, and a build-time source-injection plugin. “Same configuration” therefore means adopting the same preset/highlighter core with a small Solid/Zaidan adaptation layer—not making the two config files byte-for-byte identical.

The current implementation is not missing a plugin required for the three component pages. It already implements the relevant outcomes. It only lacks some **optional Fumadocs features**: imported image metadata, structured data for search, and Fumadocs' MDX-exported TOC. Those are not responsible for the visible component-doc differences.

## What shadcn actually configures

Shadcn's entire global override is small: it takes Fumadocs' default plugin list, removes the first rehype plugin (`rehypeCode`), and appends `rehype-pretty-code` with Vesper/GitHub Light themes and a custom Shiki transformer ([source.config.ts](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/source.config.ts#L1-L24)). It pins `fumadocs-mdx` 15.0.12 and `fumadocs-core` 16.10.5 ([package.json](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/package.json#L63-L92)), and attaches Fumadocs through `createMDX()` in Next config ([next.config.mjs](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/next.config.mjs#L226-L228)).

The transformer stores raw source and derived npm/yarn/pnpm/bun commands on code nodes ([highlight-code.ts](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/lib/highlight-code.ts#L13-L58)). Shadcn's React MDX `code` renderer consumes those properties to show copy controls and command tabs ([mdx-components.tsx](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/mdx-components.tsx#L219-L260)). This renderer is part of the configuration contract even though it is not declared in `source.config.ts`.

Component demos are not a Fumadocs plugin. Current shadcn resolves and formats source inside its async React `ComponentSource`, while `ComponentPreview` resolves the live registry component and passes full/three-line source views to the preview UI ([ComponentSource](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/component-source.tsx#L12-L84), [ComponentPreview](https://github.com/shadcn-ui/ui/blob/cb2bcd88d93b2f9bddb030e9136f1f8773e7eac4/apps/v4/components/component-preview.tsx#L69-L109)). Zaidan's [source-injection plugin](../../src/lib/remark-plugins/component-source.ts) is the Solid/Vite equivalent and should remain even if Fumadocs compiles the MDX.

## Exact plugin comparison

Fumadocs' preset supplies the following order ([preset](https://github.com/fuma-nama/fumadocs/blob/7974b8655bdb14d91792b9382186afbabe37a00b/packages/mdx/src/config/preset.ts#L68-L130)):

| Fumadocs/shadcn preset | Current Zaidan equivalent | Action |
| --- | --- | --- |
| `remarkGfm` | `remark-gfm` | Equivalent; use one, not both. |
| `remarkHeading` | `rehype-slug` plus Velite `s.toc()` | Same basic outcome, different stage. Adopting Fumadocs lets `remarkHeading` own IDs; avoid duplicate slug generation. |
| `remarkImage` | No equivalent | Optional missing feature. Add only if local-image imports/dimensions are wanted. It is not needed for component-doc parity. |
| `remarkCodeTab` | `remarkCodeTabs` + `remarkTabGroup` | Overlapping but different output conventions. Keep Zaidan's plugin or migrate all content and add the Fumadocs `CodeBlockTabs*` Solid renderers. |
| `remarkNpm` | `remarkPackageManagerTabs` | Overlapping but not interchangeable. Fumadocs recognizes `npm` and `package-install`; Zaidan also uses `package-dlx`, `package-create`, `package-install-dev`, etc. Keep the Zaidan transform unless those fences are migrated. |
| `remarkStructure` | No equivalent | Optional missing feature for full-text/search indexing. It adds no visible component-page behavior. |
| `rehypeCode` | `rehype-expressive-code` | Both highlight code. Shadcn explicitly removes Fumadocs' version and uses `rehype-pretty-code`; adopting exact code rendering means replacing Expressive Code, its plugins, its Solid `innerHTML` repair, and related CSS together. |
| `rehypeToc` | Velite `s.toc()` | Duplicate outcome. Keep Velite's TOC unless the source layer is migrated too. |

Zaidan also has behavior absent from the Fumadocs default preset: frontmatter handling for its current compiler, GitHub-alert/directive transforms, `kbd` classes, raw HTML, autolinked headings, build-time component source injection, and `file=` code imports ([active compiler](../../src/lib/vite-plugins/mdx.ts#L54-L108)). Those plugins must either remain or their content syntax/renderers must be migrated.

## What prevents a literal copy

1. **Bundler integration:** shadcn calls `fumadocs-mdx/next`; Zaidan must call `fumadocs-mdx/vite`. This is an adapter difference, not a capability gap.
2. **JSX runtime:** shadcn's output and MDX component map are React/Next; Zaidan must retain the Solid compiler/provider options and Solid renderers.
3. **Content source ownership:** shadcn's `defineDocs()` supplies collections, frontmatter, generated source indexes, exported TOC, and structured data. Zaidan's [Velite schema](../../velite.config.ts) already owns collections and TOCs. Enabling both ownership models without deciding which is authoritative creates duplicate metadata and generated indexes.
4. **Code block contract:** shadcn's Pretty Code transformer and React `code` renderer are paired. Switching only the rehype plugin would lose or leak raw/command properties. Zaidan's current Expressive Code renderer and CSS form a different paired contract.
5. **Existing MDX syntax:** Zaidan's package-manager fence languages and directives are broader/different from Fumadocs defaults. Removing the custom plugins would break existing pages even if the three new pages happened to compile.
6. **Component source loading:** shadcn can read and highlight source in an async React server component. Zaidan's Solid client/SSR path uses injected MDX children instead. This requires an app-specific plugin in Zaidan; Fumadocs does not replace it.

None of these is a hard blocker. They mean the change is a pipeline migration, not a dependency/config-file swap.

## Recommended migration

For the lowest risk, keep the current pipeline. It already renders the requested pages correctly and has no missing mandatory plugin. If the goal is instead to reduce custom MDX infrastructure and track shadcn's processor more closely, migrate in two deliberate phases:

### Phase 1: use the Fumadocs compiler preset, keep Velite

1. Pin the same compatible family (`fumadocs-mdx@15.0.12`, `fumadocs-core@16.10.5`) and use `fumadocs-mdx/vite`, not the Next adapter.
2. Configure the Vite adapter with `index: false` and `updateViteConfig: false`; keep Velite as the metadata/index source.
3. Put the Solid MDX options in `source.config.ts`.
4. In the Fumadocs remark-plugin callback, disable or remove `remarkCodeTab` and `remarkNpm`, then insert Zaidan's directives, package tabs, component-source, and code-import plugins **before `remarkStructure`**. Alternatively migrate every affected MDX fence and provide Solid `CodeBlockTabs*` components first.
5. Decide on one TOC owner. While Velite remains, remove/disable Fumadocs `rehypeToc` or ignore its export and test that its React-oriented TOC AST does not affect Solid compilation.
6. Retain Expressive Code initially. This proves the content/compiler migration without changing code rendering.

An adapted configuration would conceptually look like this (illustrative, not drop-in until plugin exports/options are wired):

```ts
// source.config.ts
import { defineConfig } from "fumadocs-mdx/config";

export default defineConfig({
  mdxOptions: {
    jsx: true,
    jsxImportSource: "solid-js",
    providerImportSource: "solid-mdx",
    stylePropertyNameCase: "css",
    remarkCodeTabOptions: false,
    remarkNpmOptions: false,
    remarkPlugins(plugins) {
      // Insert Zaidan transforms before the final remarkStructure plugin.
      plugins.splice(-1, 0, ...zaidanRemarkPlugins);
      return plugins;
    },
    rehypePlugins(plugins) {
      // Replace Fumadocs rehypeCode with the selected Zaidan highlighter.
      plugins.shift();
      plugins.unshift(zaidanHighlighter);
      return plugins;
    },
  },
});
```

```ts
// vite.config.ts (relevant portion)
import fumadocsMdx from "fumadocs-mdx/vite";

export default defineConfig({
  plugins: [
    fumadocsMdx(undefined, {
      index: false,
      updateViteConfig: false,
    }),
    // Solid, TanStack Start, Velite, etc.
  ],
});
```

### Phase 2: opt into shadcn's code renderer

1. Replace Expressive Code with `rehype-pretty-code` exactly as shadcn does.
2. Port the raw/npm transformer and teach Zaidan's Solid `code`, `pre`, and figure renderers to consume the generated properties.
3. Port the relevant Pretty Code CSS and remove the Expressive Code-only CSS, plugins, and `rehypeFixExpressiveCodeJsx`.
4. Migrate package command fences if the goal is the same authoring syntax as shadcn, then remove Zaidan's package-manager transform.
5. Run the complete docs suite: all existing MDX files, SSR/build, headings/TOC, directives, image handling, every package command variant, code copy/line highlights, and source previews.

A full Phase 2 migration can achieve effectively the same configuration as shadcn while remaining Solid. It is technically possible, but it has little visible benefit after the current parity work and creates a broad regression surface. The recommended default is therefore **do not migrate solely for visual parity**; adopt Fumadocs only if its structured search data, image pipeline, generated content source, or reduced long-term plugin maintenance are explicit goals.

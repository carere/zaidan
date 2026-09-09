# Solid 2 runtime and website toolchain migration research

Research date: 2026-09-09. Question: [Determine the Solid 2 runtime and website toolchain migration path](https://github.com/carere/zaidan/issues/495). Repository baseline: `d1ddcf24aa358a43918ae5938eb86506c29e1bba`. This is research, not a migrated website or a compatibility certification.

## Findings

A published Solid 2 runtime/compiler baseline exists and installs in isolation. The website cannot migrate through version substitutions alone: shipped `solid-mdx` and `lucide-solid` contain removed Solid APIs, while application and registry source use Solid 1 lifecycle, props, JSX types, async boundaries and stores. TanStack integration compatibility is a separate dependency investigation; retaining its ownership of routing/SSR/prerendering avoids an unnecessary framework change. No full Zaidan build, browser hydration, or Worker preview was executed.

The accepted effort policy allows necessary documented public API changes while preserving website appearance and behavior. Solid 1 stays on main during development; Solid 2 work stays on `refactor/solid-2`. These policies do not imply that upstream prerelease dependencies are ready to release.

## Exact candidate baseline

The following registry metadata was read directly, and package tarballs for Solid, web, the Vite plugin, compiler plugin, MDX provider, storage and icons were inspected. Dist tags move; pin versions and commit the lockfile when implementing.

| Area | Exact candidate / finding | Evidence and limits |
| --- | --- | --- |
| Runtime | `solid-js@2.0.0-rc.7` | `next` at research time; depends on `@solidjs/signals@^2.0.0-rc.7`. [Published metadata](https://registry.npmjs.org/solid-js/2.0.0-rc.7). |
| Web renderer | `@solidjs/web@2.0.0-rc.7` | Separate direct dependency; peer Solid `^2.0.0-rc.7`. Legacy `solid-js/web` is absent from core exports. [Metadata](https://registry.npmjs.org/@solidjs/web/2.0.0-rc.7). |
| Vite integration | `@solidjs/vite-plugin@3.0.0-next.40` | Renamed package, peers Vite 8/9 and Solid/web rc.7. Existing `vite-plugin-solid@2.11.14` is Solid 1; its old package `next` tag points only to a wrapper. [Metadata](https://registry.npmjs.org/@solidjs/vite-plugin/3.0.0-next.40). |
| JSX compiler | `@solidjs/compiler@2.0.0-rc.7`, `@solidjs/babel-plugin@2.0.0-rc.7` | Plugin next.40 ranges begin at rc.6; isolated install resolved rc.7. Native is the default; `compiler: 'babel'` is an escape hatch, not a full native-tooling opt-out: HMR and lazy module transforms remain native. Do not choose stale `babel-preset-solid@next` (rc.2) as the new integration merely because its name is familiar. [Plugin README](https://unpkg.com/@solidjs/vite-plugin@3.0.0-next.40/README.md), [Babel metadata](https://registry.npmjs.org/@solidjs/babel-plugin/2.0.0-rc.7). |
| Vite | `8.2.0` | Existing declared baseline satisfies new plugin peers; no Vite major upgrade is required by this evidence. Node engine is `^20.19.0 || >=22.12.0`; actual repo tooling uses Bun. [Metadata](https://registry.npmjs.org/vite/8.2.0). |
| Cloudflare | Existing `@cloudflare/vite-plugin@1.50.0` + `wrangler@4.118.0` | Compatible peer ranges with Vite 8; no Solid peer. This establishes package constraints, not Solid 2 SSR compatibility. Avoid unrelated upgrades just to migrate Solid. [Metadata](https://registry.npmjs.org/@cloudflare/vite-plugin/1.50.0). |
| Storage | `@solid-primitives/storage@5.0.0-next.4` | Solid/web RC peers, utils next.4; shipped implementation uses `latest`, `snapshot`, actions and new store reconciliation. `makePersisted` and `messageSync` still exist. [Metadata](https://registry.npmjs.org/@solid-primitives/storage/5.0.0-next.4), [shipped implementation](https://unpkg.com/@solid-primitives/storage@5.0.0-next.4/dist/persisted.js). |
| MDX compiler | Retain `@mdx-js/mdx@3.1.1` initially | Emits JSX for downstream Solid compilation; provider is independently configurable. Small compile/render experiment below passed with a suitable intrinsic wrapper. [Official options](https://mdxjs.com/packages/mdx/#processoroptions). |
| MDX provider | Replace or port `solid-mdx@0.0.7` | Sole published version peers Solid 1 and imports removed APIs. Concrete blocker, not merely a stale peer declaration. [Published implementation](https://unpkg.com/solid-mdx@0.0.7/dist/index.mjs). |
| Lucide | Published `lucide-solid@1.43.0` is incompatible; investigate pinned fork below | Current `latest` and `next` metadata both peer Solid 1. Source uses removed `splitProps`, `solid-js/web`, and `Context.Provider`. [Metadata](https://registry.npmjs.org/lucide-solid/1.43.0), [Icon source](https://unpkg.com/lucide-solid@1.43.0/dist/source/Icon.jsx), [context source](https://unpkg.com/lucide-solid@1.43.0/dist/source/context.jsx). |
| Icon preprocessing | `vite-plugin-lucide-preprocess@1.6.0` inspected | Framework-neutral import rewriting, not a compatibility adapter. Solid imports become `lucide-solid/icons/...`; selected fork must preserve these exports, aliases and source conditions. [Source](https://unpkg.com/vite-plugin-lucide-preprocess@1.6.0/dist/plugin.js). No need to upgrade existing 1.5.3 inferred without testing it. |

## Repository-specific migration rules

The primary migration authority is the [Solid migration guide pinned at 91088d2](https://github.com/solidjs/solid/blob/91088d2c2b867492c173b0e45f8b40cbe8390b1b/documentation/solid-2.0/MIGRATION.md), rather than old beta examples. Its rules must be applied to shipped registry sources and documentation snippets as well as website files.

- Move web runtime and DOM type imports to `@solidjs/web`; move store imports to `solid-js`. Set both TypeScript and MDX `jsxImportSource` to `@solidjs/web`, preserving JSX for the Solid compiler. DOM `JSX`/`ComponentProps` types come from the renderer; renderer-neutral `Component`/`Element` belong to core.
- Rewrite effects as tracked computation plus side-effect application; cleanup is returned from application. Replace `onMount` with `onSettled`, and audit `onCleanup` inside refs because refs are now unowned. Clipboard feedback timers, scroll observers and theme listeners are concrete website sites.
- Setters commit at a microtask flush. Audit write-then-read code, multi-setter event handlers, controlled inputs and imperative measurements. Do not add `flush()` everywhere to hide assumptions. Tests expecting immediate reads must explicitly account for settling.
- Replace `splitProps` with reactive `omit` and direct props reads; replace `mergeProps` with `merge` while preserving intended defaults: explicit `undefined` now overrides rather than being skipped. Wrappers must not leak styling/control props to DOM elements.
- Rewrite stores with draft setters, or explicitly chosen `storePath` compatibility calls; replace `unwrap` with `snapshot`. Derived state should be expressed as derivation rather than writes inside reactive computations.
- Migrate `Suspense`/`ErrorBoundary` to `Loading`/`Errored`; resource queries to async computations. Initial fallback and subsequent pending states differ, and bare `refresh` does not imply a pending indicator. Review lazy demos and root route boundaries for equivalent loading behavior.
- `Index` becomes `For keyed={false}`; inspect callback item/index shapes. Ordinary `For` is still raw item plus index accessor. Context itself is now the provider.
- Replace JSX `classList` with structured `class`, removed directives/namespaces with supported refs/events, and review boolean/ARIA/data attributes and SVG spelling. DOM `element.classList` remains an ordinary browser API and must not be mechanically replaced.

These are observed migration areas, not a complete enumerated edit inventory. Baseline files include [Vite configuration](https://github.com/carere/zaidan/blob/d1ddcf24aa358a43918ae5938eb86506c29e1bba/vite.config.ts), [root document](https://github.com/carere/zaidan/blob/d1ddcf24aa358a43918ae5938eb86506c29e1bba/src/routes/__root.tsx), [package-manager control](https://github.com/carere/zaidan/blob/d1ddcf24aa358a43918ae5938eb86506c29e1bba/src/components/package-manager-code-block.tsx), and [MDX pipeline](https://github.com/carere/zaidan/blob/d1ddcf24aa358a43918ae5938eb86506c29e1bba/src/lib/vite-plugins/mdx.ts).

## MDX provider is a real seam

The existing provider supplies intrinsic HTML/SVG component wrappers using `Dynamic`, merges nested provider maps and exports `useMDXComponents`. Its shipped module also embeds DOM element-name tables. Replacing its context API alone is insufficient; preserve intrinsic wrapping, provider overrides, nested inheritance and component reactivity. The root Vite config explicitly optimizes `solid-mdx` because MDX injects it invisibly to the dependency scanner; update that integration if using a replacement package, or remove the obsolete optimize entry if using a local module. Keep `jsx: true` and `.mdx` in Solid's transformed extensions.

Possible directions are a small repository-owned provider module implementing the existing needed contract or a maintained Solid 2 fork. Research did not establish a published drop-in Solid 2 provider. Choosing ownership is a decision for the map. A static `useMDXComponents` map may be sufficient for some pages but must not silently discard context/custom-component behavior.

## Lucide fork evidence and remaining packaging work

[Upgrade to Solid 2.0 RC0](https://github.com/lucide-icons/lucide/pull/4751) by davedbase is open and unmerged. Exact inspected head: [`davedbase/lucide@dca5e9dfd9bf0c8f6f638db7b031893baf10aa34`](https://github.com/davedbase/lucide/tree/dca5e9dfd9bf0c8f6f638db7b031893baf10aa34). Source changes address the removed APIs. The author reports typecheck, 18 tests and package build passed; those checks were not repeated here.

The PR prose describes pinned versions, but actual inspected manifest still has moving `next` dev dependencies and only a Solid peer; `@solidjs/web` is a dev dependency despite emitted imports. Treat the immutable code and lockfile, not prose, as evidence. This is a monorepo package with workspace build dependencies; a GitHub root URL is not a verified consumer-installable `lucide-solid` artifact. Choose a reproducible build/publish or package-tarball strategy, add explicit web runtime requirements, and verify generated icon inventory and exports before adoption. The current published package also has newer source changes than this fork; check every icon Zaidan imports instead of assuming the fork includes latest inventory.

## SSR, prerender and Cloudflare boundary

Keep `solid({ ssr: true, hot: true, extensions: ['.tsx', '.mdx'] })` in transform-only mode under the renamed plugin initially. Its README explicitly distinguishes this from opt-in `start: true`, which introduces its own server/framework wiring. Zaidan already has TanStack Start and a Cloudflare-managed `ssr` Vite environment; introducing Solid plugin start mode would add a separate architectural migration.

The current Worker entry is `@tanstack/solid-start/server-entry`, with `nodejs_compat`. Cloudflare's [TanStack guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) documents platform integration but does not prove this exact Solid 2 combination. Runtime export conditions, serialized async data, hydration scripts, head metadata, streaming completion and prerender collection must be verified against the selected TanStack fork/build.

Preserve the explicit prerender page list and current exclusions (`/create`, `/charts`, `/preview/*`, `/r/*`), concurrency/error handling, and server minification. Current build comments record a prior Worker upload-size problem; a successful client build alone does not establish deployability. Registry generation is a build dependency and `public/r` is copied to client output, so refreshed registry artifacts must be validated as well.

## Checks performed and their limits

A throwaway directory outside the repository installed exact Solid/web rc.7, Vite plugin next.40, Vite 8.2.0, MDX 3.1.1 and storage next.4 using Bun 1.4.2 (198 packages, successful resolution). The initial default temp directory was sandbox-restricted; retry with explicit `/tmp` cache and temp directories succeeded. This is an installability probe of this subset, not the full dependency graph.

A small MDX sample (`# Hello Solid 2` plus a custom component) compiled through MDX and `@solidjs/babel-plugin@2.0.0-rc.7` in both DOM and hydratable SSR modes without legacy web imports. Running generated SSR with `renderToString` initially failed because the MDX intrinsic default `h1: 'h1'` was called as a component. Supplying `h1: props => Dynamic({ component: 'h1', ...props })` rendered the expected heading and custom component. This establishes why the intrinsic provider contract matters. It does not establish full MDX plugin compatibility, native compiler output equivalence, browser hydration, or persistence behavior. No application files were migrated.

## Acceptance evidence required during implementation

1. Fresh frozen-lockfile installation on supported developer/CI platforms; no unintended Solid 1 runtime, removed subpaths or unsupported peers in the selected graph. Package sources and compiled outputs must resolve the same Solid/web instance.
2. Registry schema validation and generation, generated Velite content, TypeScript checks and relevant existing tests. Compile all TSX/MDX registry demos and check generated consumer dependency metadata includes web runtime and chosen prereleases.
3. Production client + Worker SSR + prerender build with unchanged path coverage; direct loads and client navigation of docs, blocks, dynamic previews, charts/create pages, registry URLs and 404s. Check head/canonical metadata and status codes, fallback completion and output size.
4. Browser hydration with no mismatch or reactive diagnostics, followed by interaction checks: theme bootstrap/persistence, sidebar/mobile navigation, search/command, copy timers, code tabs, lazy demo rendering, iframe messages and scroll/TOC behavior.
5. MDX rendered HTML and syntax-highlighting structure, nested providers, custom components, package-manager tabs and disclosure code blocks. Test native compiler on actual pipeline; investigate Babel only if a measured native discrepancy arises.
6. Storage initial hydration versus persisted choice, unavailable/malformed storage, cross-tab BroadcastChannel sync and reset/null behavior. The new storage code uses `latest` when persisting batched writes; do not assume old timing.
7. Lucide static and reactive props, ARIA attributes, all imported icon names and aliases, tree-shaken production imports and SSR/source export conditions.

## Decisions exposed

- Should Zaidan own the small MDX provider compatibility layer or maintain a fork, and what subset of the provider contract is public/required?
- What reproducible package artifact and ownership policy should cover the unmerged Lucide migration, including its web peer and required icon inventory? Coordinate with the broader upstream-fork policy.
- Which browser/SSR parity matrix is the release gate? The checks above are candidate acceptance requirements; they do not claim the gate has been passed.

These questions are precise enough for new decision tickets. The package and source blockers are identified; complete website compatibility remains an implementation validation obligation rather than a fact this research can certify.

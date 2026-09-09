# Solid 2 ecosystem sources and installability

Research for [Determine installable Solid 2 sources for TanStack, Embla, and charts](https://github.com/carere/zaidan/issues/497), checked 2026-09-09. This establishes available artifacts and blockers; it does not choose unapproved replacements or implement the migration. Solid 1 stays on main and Solid 2 on refactor/solid-2 until release readiness; necessary documented API changes are allowed.

## Findings

Published prereleases already cover Router, Start, router devtools and charts. Embla's Solid 2 change remains an unmerged source change. Table and Virtual have no verified consumable Solid 2 artifact in this investigation. Thus “use the maintainer's branch” cannot by itself specify the migration dependency graph.

| Package | Exact candidate or current artifact | Peer requirements / assessment |
| --- | --- | --- |
| solid-js / @solidjs/web | 2.0.0-rc.7 / 2.0.0-rc.7 | Both next tags resolve here; web peers solid-js ^2.0.0-rc.7. Probe baseline, not a map-wide version decision. |
| @tanstack/solid-router | 2.0.0-rc.7 (rc tag) | solid-js and @solidjs/web >=2.0.0-0 <3.0.0; web dependency ^2.0.0-rc.6. Published artifact available. |
| @tanstack/solid-start | 2.0.0-rc.7 (rc tag) | solid-js >=2.0.0-0 <3.0.0, web >=2.0.0-rc.6 <3.0.0, Vite >=7; optional rsbuild ^2.0.0. Pins Router and Solid Start client/server rc.7. |
| @tanstack/solid-router-devtools | 2.0.0-rc.5 (rc tag) | Solid/web ^2.0.0-rc.6, Router ^2.0.0-rc.5, router-core ^1.171.22. Versions need not have matching rc suffixes. |
| @tanstack/devtools-vite | 0.8.5 (latest) | Vite ^6 || ^7 || ^8; no direct Solid peer. Installs alongside the RC stack. |
| @tanstack/solid-table | 9.2.4 (latest) | Solid >=1.3; excludes RC prereleases under normal npm resolution, and code is still Solid 1-oriented. No ready candidate established. |
| @tanstack/solid-virtual | 3.13.38 (latest) | Solid ^1.3.0; uses removed createComputed. Not compatible with Solid 2. |
| embla-carousel / autoplay / reactive-utils | 9.0.0-rc03 | Published matching artifacts exist. Autoplay peers exactly embla-carousel 9.0.0-rc03. |
| embla-carousel-solid | 9.0.0-rc03 (next) | Published version still peers Solid ^1.0.0. The similarly versioned fork manifest is different; do not confuse them. |
| solid-recharts | 2.0.0-beta.1 (next) | Solid and web ^2.0.0-beta.17; permits rc.7. Published gitHead equals inspected main b1f9c6729eefb42caf96d2162ad8c71c2c5520e3. |

Primary manifests: [Solid](https://registry.npmjs.org/solid-js/2.0.0-rc.7), [web](https://registry.npmjs.org/@solidjs/web/2.0.0-rc.7), [Router](https://registry.npmjs.org/@tanstack/solid-router/2.0.0-rc.7), [Start](https://registry.npmjs.org/@tanstack/solid-start/2.0.0-rc.7), [router devtools](https://registry.npmjs.org/@tanstack/solid-router-devtools/2.0.0-rc.5), [Vite devtools](https://registry.npmjs.org/@tanstack/devtools-vite/0.8.5), [Table](https://registry.npmjs.org/@tanstack/solid-table/9.2.4), [Virtual](https://registry.npmjs.org/@tanstack/solid-virtual/3.13.38), [Embla adapter](https://registry.npmjs.org/embla-carousel-solid/9.0.0-rc03), [autoplay](https://registry.npmjs.org/embla-carousel-autoplay/9.0.0-rc03), [charts](https://registry.npmjs.org/solid-recharts/2.0.0-beta.1).

## Upstream status and source packaging

### TanStack

Searching GitHub for PRs authored by davedbase in TanStack returned no matches. Do not attribute the available TanStack migrations to that author. Router's [RC0 upgrade](https://github.com/TanStack/router/pull/8058) and [RC4 upgrade](https://github.com/TanStack/router/pull/8189), authored by brenelz, are merged into solid-router-v2-pre; their merge SHAs are df8839d83f428759dc1f187d1732cf6388e71394 and 22fd367d8103edd0150acf3be75af9aa03eec6c3. Published rc packages are preferable to extracting packages from that monorepo. Their tarballs contain declared dist entrypoints.

Table's [WIP Solid v2 reactivity adaptation](https://github.com/TanStack/table/pull/6242) is **open**, authored by brenelz, at **ac32215e6ef6d9e7a35d92449d64d1ecb57b9ace** on brenelz/table:upgrade-to-solid-v2-beta. It targets Solid beta.15 and package 9.0.0-alpha.42, predating Zaidan's current ^9.1.2 baseline. Its [package manifest](https://github.com/brenelz/table/blob/ac32215e6ef6d9e7a35d92449d64d1ecb57b9ace/packages/solid-table/package.json) uses @tanstack/table-core workspace:* and a tsdown build. It is an investigation/reference source, not a validated RC7 drop-in or standalone Git dependency. A selected fork would need reconciliation with current Table APIs, complete Solid 2 changes, build and packed workspace dependency resolution.

The current Table tarball imports createComputed from solid-js, and its compiled FlexRender imports solid-js/web. Virtual's tarball also imports createComputed and uses Solid 1 store update patterns. RC7 does not export createComputed (verified locally). Widening peers or forcing installation cannot fix these code differences. [Virtual's current package source](https://github.com/TanStack/virtual/tree/main/packages/solid-virtual) and [Table's current package source](https://github.com/TanStack/table/tree/main/packages/solid-table) are the upstream tracking locations; the exact tarballs linked above are the immutable evidence examined.

No Solid 2 Virtual PR was found in the bounded search. The open [fix(solid-virtual): fix [wip]](https://github.com/TanStack/virtual/pull/1216), gameroman/tanstack-virtual at 3d3fbec67c5e26388032f80e222010bc440c9b0d, discusses filtering/reactivity fixes rather than a Solid 2 migration; it is **not** a supported candidate merely because its title mentions Solid.

### Embla

[Add support for Solid 2.0 RC0](https://github.com/davidjerleke/embla-carousel/pull/1384), authored by davedbase, is **open and unmerged**. Immutable candidate: **davedbase/embla-carousel@c6b7f1347b330e850a3d22db8cb05d6021cefc7a**, branch chore/update-solid-2. It rewrites effects to compute/apply, changes the adapter peer to ^2.0.0-rc.0 and targets Embla v9 RC. The PR author reports successful package builds and playground builds; those are upstream reports, not reproduced by this investigation.

The [root manifest](https://github.com/davedbase/embla-carousel/blob/c6b7f1347b330e850a3d22db8cb05d6021cefc7a/package.json) is a private Yarn 3.3.1 monorepo, not the adapter package. The [adapter manifest](https://github.com/davedbase/embla-carousel/blob/c6b7f1347b330e850a3d22db8cb05d6021cefc7a/packages/embla-carousel-solid/package.json) declares generated esm/cjs entrypoints and a Rollup build; the Git tree contains source and config, not those generated outputs. A plain GitHub root dependency therefore does not deliver the adapter. A usable bridge requires building the workspace at the SHA, packing the adapter, pinning the result by integrity, and using matching v9 RC core/reactive-utils/autoplay packages. This pipeline was not run; the built artifact remains an implementation prerequisite if that bridge is chosen.

Embla's v9 core/adapter family is distinct from Zaidan's v8 baseline. The PR explicitly notes lockstep publishing and release timing concerns. A decision must cover v9 API migration versus maintaining a v8-based Solid 2 adapter, as well as how consumers obtain a reproducible preview artifact. Track the PR and replace any bridge only after an upstream package contains the required change and passes parity checks.

### Charts

[Main at b1f9c6729eefb42caf96d2162ad8c71c2c5520e3](https://github.com/yumemi-thomas/solid-recharts/tree/b1f9c6729eefb42caf96d2162ad8c71c2c5520e3) is already published as **solid-recharts@2.0.0-beta.1**. A Git dependency is unnecessary. The root is a private monorepo; the [package](https://github.com/yumemi-thomas/solid-recharts/blob/b1f9c6729eefb42caf96d2162ad8c71c2c5520e3/packages/solid-recharts/package.json) exports **./src/index.ts**, and the published tarball includes TS/TSX sources. Its root dev baseline remains Solid beta.17. Installation against rc.7 succeeds, but RC compatibility is not proven by peer acceptance. Zaidan's Vite/Solid 2 pipeline must compile dependency TSX; validate chart rendering, interactions, resizing, tooltips and SSR. This is not a precompiled library suitable for a plain Node import smoke test.

## Reproduced installability evidence

Isolated temporary probes used Node 24.20.0 and npm 11.19.0 with a temporary cache. Lifecycle scripts were disabled; no Zaidan dependencies or application source changed.

1. A clean install of solid-js@2.0.0-rc.7, @solidjs/web@2.0.0-rc.7, Router/Start rc.7, router-devtools rc.5, devtools-vite 0.8.5 and charts beta.1 **succeeded**, adding 160 packages. npm emitted transitive Solid 1 peer override warnings for @solid-devtools/logger, @solid-primitives/refs, @solidjs/meta and related dependencies. This is a real remaining dependency-hygiene concern, not a peer-clean graph. A targeted grep found no imports of logger/meta/refs in Router's dist/esm JS, but that limited check does not establish whole-application safety or justify overrides.
2. Charts + Solid/web rc.7 alone installed cleanly, adding 17 packages.
3. A clean Table 9.2.4 + Solid/web rc.7 install **failed ERESOLVE** (Solid peer >=1.3 does not include this prerelease).
4. A clean Virtual 3.13.38 + Solid rc.7 install **failed ERESOLVE** (peer ^1.3.0).
5. Downloaded and inspected all six Router/Start/router-devtools/Table/Virtual/charts tarballs from their exact registry metadata. Verified chart gitHead, source export, and legacy Table/Virtual imports. Verified RC7 lacks createComputed. Did not use --force or --legacy-peer-deps, and did not run a migrated app build or claim behavior parity.

Reproduction shape (replace package list for each case):

```sh
npm install --prefix /tmp/solid2-probe --cache /tmp/solid2-cache \
  --ignore-scripts --no-audit --no-fund --save-exact \
  solid-js@2.0.0-rc.7 @solidjs/web@2.0.0-rc.7 solid-recharts@2.0.0-beta.1
```

## Decision handoff

The research question is answered even though some required artifacts do not yet exist. The next decision is **which dependency bridges and readiness gates to adopt**: wait for upstream, maintain/package a temporary Table/Virtual adapter patch or fork, or select a replacement with demonstrated behavior equivalence; choose the Embla v9/source packaging route or a v8 bridge; and decide how to clear or isolate Router's transitive Solid 1 peer dependencies. These alternatives are not adopted here.

Once chosen, each bridge needs a pinned source SHA, reproducible build/pack recipe, artifact integrity, owner, parity evidence, and a condition for returning to published upstream packages. The release gate must check actual artifact/runtime readiness rather than only whether Solid itself has reached stable. Existing map decisions should specify registry distribution and acceptance details without duplicating these findings.

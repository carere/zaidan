# TanStack Start static generation for Zaidan

Research baseline: Zaidan on 2026-08-03 with `@tanstack/solid-start@1.168.33`, `@tanstack/solid-router@1.170.18`, `@tanstack/start-plugin-core@1.171.25`, `@cloudflare/vite-plugin@1.50.0`, and Wrangler `4.118.0`. The findings below use the current Solid-specific TanStack Start documentation, the installed package source for exact accepted options, and Cloudflare's first-party Workers documentation for deployment behavior.

## Recommendation

Use **hybrid SSG + runtime rendering**, not global SPA mode and not a completely static export:

- prerender the public home, documentation, changelog, and chart catalogue pages;
- keep `/create` as request-time SSR because its meaningful state is an unbounded `preset`/`item` query string;
- keep `/charts` as a runtime redirect to `/charts/area` rather than prerendering the redirect destination under the original URL;
- make `/preview/**` client-rendered with route-level `ssr: false` because those documents exist as browser-controlled iframe canvases and have no SEO value;
- keep `/r/$primitive/$name` as a Worker/server route because it generates JSON from arbitrary valid preset codes;
- retain the Cloudflare Worker as a fallback for runtime pages, API/server routes, and 404s.

This matches the platforms already in the repository. TanStack Start generates HTML files into the client build output, the Cloudflare Vite plugin publishes the client output as static assets, and Cloudflare serves matching assets before invoking the Worker by default ([TanStack Solid static prerendering](https://tanstack.com/start/latest/docs/framework/solid/guide/static-prerendering), [Cloudflare Vite static assets](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/), [Cloudflare asset/Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)).

## Exact Start configuration API

For the installed Solid Start version, prerendering is configured on `tanstackStart()` in `vite.config.ts`:

```ts
tanstackStart({
  prerender: {
    enabled: true,
    autoSubfolderIndex: false,
    autoStaticPathsDiscovery: false,
    crawlLinks: false,
    concurrency: 8,
    filter: ({ path }) =>
      path !== "/create" &&
      path !== "/charts" &&
      !path.startsWith("/preview/") &&
      !path.startsWith("/r/"),
    retryCount: 2,
    retryDelay: 500,
    maxRedirects: 5,
    failOnError: true,
  },
  pages: [
    // Explicit dynamic URLs, each as { path: "/actual/url" }.
  ],
})
```

The Solid guide documents `enabled`, `autoSubfolderIndex`, `autoStaticPathsDiscovery`, `concurrency`, `crawlLinks`, `filter`, retry controls, redirects, failure behavior, `onSuccess`, and top-level `pages` ([Solid prerendering options](https://tanstack.com/start/latest/docs/framework/solid/guide/static-prerendering)). The installed schema additionally confirms that a page can override `enabled`, `outputPath`, `autoSubfolderIndex`, `crawlLinks`, retry behavior, request `headers`, and `onSuccess` in its own `prerender` object (`node_modules/@tanstack/start-plugin-core/src/schema.ts`).

Important API detail: explicit routes belong in top-level `pages`, for example:

```ts
pages: [
  { path: "/docs/components/kobalte/accordion" },
  { path: "/docs/installation/vite" },
  {
    path: "/some-special-page",
    prerender: {
      enabled: true,
      outputPath: "/some-special-page/index.html",
    },
  },
]
```

Do **not** copy the `prerender.routes` examples from the React ISR guide. `routes` is not accepted by the installed Start schema. The current Solid prerendering guide correctly uses top-level `pages`; this distinction matters for Zaidan's installed packages.

`autoSubfolderIndex: true` produces `/page/index.html`; `false` produces `/page.html`. For this Cloudflare deployment, use `false`: Cloudflare's default `auto-trailing-slash` HTML handling serves `page.html` at `/page`, while a `page/index.html` asset canonicalizes to `/page/`. Zaidan's links and canonical URLs are currently slashless ([Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)). The alternative is to keep subfolder indexes and explicitly configure Cloudflare to drop trailing slashes.

## Discovery, crawling, and dynamic parameters

Automatic static path discovery includes `/` and file routes that have a component and a concrete path. It excludes:

- routes containing `$` parameters;
- pathless/layout routes;
- routes without a component, including server/API-only routes.

That behavior is documented in the [Solid prerendering guide](https://tanstack.com/start/latest/docs/framework/solid/guide/static-prerendering#automatic-static-route-discovery) and implemented by the installed `prerender-routes-plugin.ts`.

With `crawlLinks: true` (the default), Start extracts same-origin relative `<a href>` values from each generated HTML page and queues them. A dynamic route such as `/docs/components/$primitive/$slug` is therefore prerendered if an already queued page links to a concrete URL such as `/docs/components/kobalte/card` ([Solid crawling guide](https://tanstack.com/start/latest/docs/framework/solid/guide/static-prerendering#crawling-links)). Installed source shows that the crawler only scans anchor `href`s beginning with `/` or `./`; it does not discover iframe `src`s or routes only constructed in JavaScript (`node_modules/@tanstack/start-plugin-core/src/prerender.ts`).

For Zaidan, crawling can discover nearly all documentation pages because `DocsSidebar` emits their concrete links, and chart categories because `ChartsNav` emits concrete type links. The implemented configuration instead supplies the complete source-derived inventory and disables automatic discovery and crawling. This makes the output deterministic and avoids generating duplicate trailing-slash aliases from index-route links; a navigation redesign also cannot silently remove pages from the build.

Avoid treating a wildcard route pattern as a set of parameter values: Start needs concrete URLs. The installed `pages` schema accepts `path: string`, and the prerenderer requests that exact path. There is no installed `generateStaticParams`/`getStaticPaths` route hook.

The crawler follows internal redirects, up to `maxRedirects`, and writes the final response under the original queued path. This means prerendering `/charts` would write the `/charts/area` HTML under `/charts` rather than preserve the HTTP redirect. Exclude `/charts` from prerendering and let its existing `beforeLoad` redirect run through the Worker, or replace it with a deliberate static landing page before adding it to SSG.

## What actually runs during SSG

Prerendering is SSR performed during the build: Start requests each page from the built server handler, waits for the response body, then writes it to the client output as HTML. Default route behavior is `ssr: true`, which runs `beforeLoad` and `loader` on the server, renders the component, embeds loader data, and hydrates it on the client ([Solid selective SSR](https://tanstack.com/start/latest/docs/framework/solid/guide/selective-ssr#ssr-true)). This is exactly what the MDX documentation routes need: their Velite lookup and MDX preload happen at build time and the complete documentation becomes static HTML.

The other route rendering modes are:

- `ssr: false`: neither `beforeLoad` nor `loader` nor the component runs on the server; the client does all of them.
- `ssr: "data-only"`: `beforeLoad` and `loader` run on the server, but the component does not render there.
- an `ssr` function can choose among these per validated params/search value.

These modes and their inheritance rules are documented in [Selective SSR](https://tanstack.com/start/latest/docs/framework/solid/guide/selective-ssr). A child can only become more restrictive than its parent. For the first non-SSR route, Start renders its pending fallback into the server document. Therefore, prerendering a route marked `ssr: false` creates a static client shell/fallback, not SEO-ready page content.

Global SPA mode is separate from SSG and is not needed for this plan. SPA mode creates `/_shell.html`, disables server execution/rendering for matched route content, and requires a host fallback/rewrite; Start explicitly supports prerendering selected routes alongside that shell ([Solid SPA mode](https://tanstack.com/start/latest/docs/framework/solid/guide/spa-mode)). Zaidan already needs a Worker for `/r/**`, and most of the site benefits from complete static HTML, so route-level rendering choices are a better fit than enabling global SPA mode.

## Server functions and static generation

Normal server functions called by a route loader can execute while that route is prerendered, and their returned loader data is embedded in the generated HTML. However, future browser calls to an ordinary server function still target its RPC endpoint and therefore require a server runtime.

TanStack also documents **Static Server Functions**: add the experimental `@tanstack/start-static-server-functions` package and make `staticFunctionMiddleware` the final middleware on a GET server function. During prerendering, Start executes it and writes the result as a keyed static JSON asset; later client calls fetch that JSON asset instead of invoking a server ([Solid Static Server Functions](https://tanstack.com/start/latest/docs/framework/solid/guide/static-server-functions)). This package is not currently installed in Zaidan, and the feature is explicitly experimental.

Zaidan currently has no `createServerFn` usage, so server functions do not block SSG. `createIsomorphicFn` is used for color mode, which creates a different problem described below. The `/r/$primitive/$name` endpoint is a server route, not a server function; it must remain a Worker endpoint or be replaced with a finite static registry strategy.

## Pages that should be statically generated

The current content inventory yields **84 public HTML paths** that should be SSG.

### Home

- `/`

### Documentation indexes and guides

- `/docs`
- `/docs/components`
- `/docs/customization`
- `/docs/dark-mode`
- `/docs/faq`
- `/docs/installation`
- `/docs/roadmap`
- `/docs/zaidan-agent`

### Installation guides

- `/docs/installation/astro`
- `/docs/installation/manual`
- `/docs/installation/solid-start`
- `/docs/installation/tanstack-router`
- `/docs/installation/tanstack-start`
- `/docs/installation/vite`

### Component documentation

All 57 concrete paths under `/docs/components/kobalte/`:

- `accordion`, `alert-dialog`, `alert`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button-group`, `button`, `calendar`
- `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `combobox`, `command`, `context-menu`, `dialog`, `drawer`
- `dropdown-menu`, `empty`, `field`, `hover-card`, `input-group`, `input-otp`, `input`, `item`, `kbd`, `label`
- `menubar`, `native-select`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`
- `separator`, `sheet`, `sidebar-floating`, `sidebar-icon`, `sidebar-inset`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`
- `switch`, `table`, `tabs`, `textarea`, `toggle-group`, `toggle`, `tooltip`

### Changelog

- `/docs/changelog`
- `/docs/changelog/image-crop-and-agent-docs`
- `/docs/changelog/launch`
- `/docs/changelog/sortable-and-design-refresh`
- `/docs/changelog/zaidan-agent`

### Charts catalogue

- `/charts/area`
- `/charts/bar`
- `/charts/line`
- `/charts/pie`
- `/charts/radar`
- `/charts/radial`
- `/charts/tooltip`

These pages are public, stable for the duration of a deployment, SEO-relevant, and backed by source-controlled data and modules. Interactivity inside a statically generated page does not prevent SSG; Solid hydrates the static HTML afterward.

## Pages that should not be SSG

| Path | Rendering | Reason |
| --- | --- | --- |
| `/charts` | Runtime redirect | Its index route redirects to `/charts/area`. TanStack's prerenderer follows redirects and writes the final HTML under the original path, so SSG would turn the redirect into an alias rather than preserve its semantics. |
| `/create?preset=…&item=…` (including `/create`) | Runtime SSR (`ssr: true`, the default), excluded from prerender | Its primary state comes from an unbounded query string. Runtime SSR can render the requested preset without a default-content flash and still hydrates all interactions. If reducing Worker use matters more than first-render fidelity, an alternative is route-level CSR plus a prerendered shell. |
| `/preview/create` | CSR (`ssr: false`) | Browser-controlled iframe canvas; it intentionally waits for `postMessage` state and has no standalone SEO value. Current SSR produces no useful preview because `isReady` becomes true only in client effects. |
| `/preview/$kind/$primitive/$slug` | CSR (`ssr: false`) | Same iframe/postMessage behavior, with browser-side dynamic component loading and runtime theme mutation. Do not enumerate these as SSG pages. |
| `/preview/charts/$name` | CSR (`ssr: false`) | Interactive iframe preview with browser messaging; no SEO benefit. |
| `/r/$primitive/$name` | Dynamic Worker/server route | Returns JSON for an unbounded encoded preset. Keep its existing immutable public cache header. It has no route component and automatic static discovery already excludes it. |
| Unknown/invalid URLs | Runtime SSR 404 | The existing root `notFoundComponent` can remain the Worker fallback. A separate `404.html` is optional only if switching to static-host 404 handling. |

The `/create` choice is a product tradeoff rather than a technical restriction. The component is currently SSR-safe because its direct `window`/`document` work is inside callbacks, `onMount`, or client effects. Runtime SSR is recommended because every valid query string can have distinct initial content. A fully static deployment would instead make `/create` CSR and would need to remove or relocate the dynamic `/r/**` endpoint.

## Zaidan-specific prerequisite: color mode

The current root shell reads `zaidan-color-mode` with `getCookie()` during SSR and uses it to set the `<html>` class. During SSG, that request is a build-time request with no visitor cookie, so every generated HTML file will contain the build default (`light`). A later dark-mode visitor can then get a hydration mismatch or a light-to-dark flash when the client branch reads the visitor's cookie/media query.

Before shipping SSG, make root HTML deterministic and apply the visitor's theme with an early inline bootstrap script before paint/hydration, or accept a static default and a client-side transition. Routing every generated page through the Worker to personalize the class would defeat Cloudflare's asset-first SSG benefit.

More generally, SSG loaders and shells must not depend on visitor cookies, authentication, request geography, or other per-request state. Any such path belongs in runtime SSR or must render a deterministic public representation.

## Zaidan-specific prerequisite: GitHub stars

`GitHubLink` is present in the shared public header and `StarsCount` currently starts a GitHub API request through `createResource` during server rendering. Prerendering every public page can therefore repeat that external request for each build-time page, risk GitHub's unauthenticated rate limit, and freeze the displayed count until the next deployment.

Make the star count client-only (for example, with TanStack Router's `ClientOnly` and the existing skeleton), or move it behind a separately cached endpoint/build-wide memo. The navigation and link itself can remain in the static HTML; only the volatile count needs client or independently cached rendering.

## Cloudflare deployment behavior

Zaidan already uses the official Cloudflare Vite plugin and the Solid Start Worker entrypoint. No `assets.directory` entry needs to be added manually: the Vite plugin generates output Wrangler configuration whose asset directory points at the client build output ([Cloudflare Vite asset configuration](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/#configuration)).

Cloudflare's default is asset-first: if `/docs/...` resolves to a generated asset, Cloudflare serves it without invoking the Worker; when there is no asset, the request falls through to the Worker ([Cloudflare static asset routing](https://developers.cloudflare.com/workers/static-assets/#routing-behavior)). That gives Zaidan the desired hybrid deployment automatically:

1. generated SSG HTML/CSS/JS is served and cached as static assets;
2. `/create`, `/preview/**`, `/r/**`, and missing paths fall through to the Start Worker;
3. `assets.run_worker_first` should remain unset/false unless a specific path must run middleware before asset delivery.

Cloudflare supports selective `run_worker_first` path patterns if a future server route collides with an asset path, but it should not be enabled globally because that forces every SSG request through Worker compute ([Cloudflare Worker-first controls](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/#run-worker-before-each-request)).

Use `vite build` followed by `vite preview` to test the actual Workers build. Verify both the generated file inventory and routing behavior: a static docs request should succeed as an asset, `/r/kobalte/preset-….json` should reach the Worker, and a nonexistent page should return the application 404.

## ISR status

There is no first-class ISR/revalidation option in the installed Solid Start configuration schema, and the current Solid Start documentation navigation has no ISR guide. The current React Start docs do have an [ISR guide](https://tanstack.com/start/latest/docs/framework/react/guide/isr), but it describes ISR as ordinary CDN caching with `Cache-Control`, `s-maxage`, and `stale-while-revalidate`, plus provider-specific purge APIs—not as a Start-owned regeneration scheduler.

Two cautions apply:

1. The React ISR guide's `prerender.routes` example does not match the current installed Start schema; use Solid's `pages` API for build-time paths.
2. A build-emitted Cloudflare static asset does not become newly rendered application HTML merely because a cache TTL expires. A true stale-while-revalidate flow requires a request to reach a dynamic renderer/origin and a CDN policy capable of caching and revalidating that response, or an adapter/provider-specific rebuild/purge workflow. Cloudflare's asset-first routing otherwise continues serving the deployed file.

For Zaidan's source-controlled docs and components, ordinary build-time SSG plus redeployment on content changes is the correct model. If runtime-fresh content is added later, keep that page in SSR, attach public CDN cache headers, and treat its revalidation/purge behavior as Cloudflare infrastructure—not a portable TanStack Solid SSG feature.

## Implementation and verification checklist

1. Fix or consciously accept the root color-mode behavior under deterministic static HTML.
2. Add `prerender.enabled: true` and the runtime-path filter to `tanstackStart()`.
3. Supply all public SSG URLs through `pages`, generated from a build-safe source inventory; keep automatic discovery and crawling disabled so the generated set stays deterministic.
4. Add `ssr: false` to the three preview route families. Leave public content routes at the default `ssr: true`.
5. Leave `/create` out of `pages` and at runtime SSR.
6. Move the shared GitHub star request out of per-page build-time rendering or cache it once for the whole build.
7. Run the production build and assert the expected 84 HTML paths. Treat a missing content page as a build failure.
8. Run `vite preview` and test direct requests, hydration, internal navigation, dark mode, canonical metadata, the `/charts` redirect, preview iframes, the registry JSON endpoint, and 404s.
9. Deploy to a non-production Cloudflare environment and confirm static pages do not invoke the Worker while runtime routes do.

## Primary sources

- [TanStack Start Solid: Static Prerendering](https://tanstack.com/start/latest/docs/framework/solid/guide/static-prerendering)
- [TanStack Start Solid: Selective SSR](https://tanstack.com/start/latest/docs/framework/solid/guide/selective-ssr)
- [TanStack Start Solid: SPA Mode](https://tanstack.com/start/latest/docs/framework/solid/guide/spa-mode)
- [TanStack Start Solid: Static Server Functions](https://tanstack.com/start/latest/docs/framework/solid/guide/static-server-functions)
- [TanStack Start Solid: Hosting](https://tanstack.com/start/latest/docs/framework/solid/guide/hosting)
- [TanStack Start React: ISR](https://tanstack.com/start/latest/docs/framework/react/guide/isr), used only to characterize TanStack's documented CDN-header approach and explicitly not as a source of Solid configuration API
- Installed TanStack Start sources: `node_modules/@tanstack/start-plugin-core/src/schema.ts`, `prerender.ts`, and `start-router-plugin/generator-plugins/prerender-routes-plugin.ts`
- [Cloudflare Vite plugin: Static Assets](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/)
- [Cloudflare Workers: Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers: Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
- [Cloudflare Workers: HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)

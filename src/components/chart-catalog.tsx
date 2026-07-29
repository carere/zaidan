import { ExternalLink, FileCode2, LoaderCircle, RefreshCcw, Terminal } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, onMount, Show, splitProps } from "solid-js";
import {
  AREA_CHARTS,
  CHART_FAMILIES,
  type ChartCatalogEntry,
  RADAR_CHARTS,
  TOOLTIP_CHARTS,
} from "@/lib/chart-catalog";
import { cn } from "@/lib/utils";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/kobalte/ui/sheet";

const sourceUrls = import.meta.glob<string>("../registry/kobalte/charts/*.tsx", {
  query: "?url&no-inline",
  import: "default",
  eager: true,
});

async function loadChartSource(slug: string, attempt: number) {
  const sourceUrl = sourceUrls[`../registry/kobalte/charts/${slug}.tsx`];
  if (!sourceUrl) throw new TypeError(`Chart source not found: ${slug}`);
  const requestUrl = new URL(sourceUrl, window.location.origin);
  requestUrl.searchParams.set("attempt", String(attempt));
  const response = await fetch(requestUrl, { cache: "no-store" });
  if (!response.ok) throw new TypeError(`Unable to load ${slug} source`);
  return response.text();
}

function ChartPreview(props: { entry: ChartCatalogEntry }) {
  const [local] = splitProps(props, ["entry"]);
  const { colorMode } = useColorMode();
  const [state, setState] = createSignal<"loading" | "ready" | "failed">("loading");
  let frame: HTMLIFrameElement | undefined;
  let failureTimer: ReturnType<typeof setTimeout> | undefined;
  let visibilityObserver: IntersectionObserver | undefined;

  const sendColorMode = () => {
    frame?.contentWindow?.postMessage(
      { type: "color-mode-sync", data: colorMode() },
      window.location.origin,
    );
  };

  const armFailureTimer = () => {
    if (failureTimer) clearTimeout(failureTimer);
    failureTimer = setTimeout(() => {
      if (state() === "loading") setState("failed");
    }, 5_000);
  };

  const retry = () => {
    setState("loading");
    frame?.setAttribute("src", "about:blank");
    requestAnimationFrame(() => frame?.setAttribute("src", `/preview/charts/${local.entry.slug}`));
    armFailureTimer();
  };

  onMount(() => {
    visibilityObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || state() !== "loading") return;
      armFailureTimer();
      visibilityObserver?.disconnect();
    });
    if (frame) visibilityObserver.observe(frame);

    const receiveMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frame?.contentWindow ||
        event.data?.type !== "chart-preview-ready"
      ) {
        return;
      }
      if (failureTimer) clearTimeout(failureTimer);
      setState("ready");
      sendColorMode();
    };
    window.addEventListener("message", receiveMessage);
    onCleanup(() => {
      window.removeEventListener("message", receiveMessage);
      visibilityObserver?.disconnect();
      if (failureTimer) clearTimeout(failureTimer);
    });
  });

  createEffect(() => {
    colorMode();
    sendColorMode();
  });

  return (
    <div class="relative h-[460px] overflow-hidden border-y bg-muted/20" data-chart-preview>
      <Show when={state() !== "ready"}>
        <div
          class="absolute inset-0 z-10 grid place-items-center bg-background/90 p-6 text-center"
          role={state() === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          <Show
            when={state() === "failed"}
            fallback={
              <div class="flex items-center gap-2 text-muted-foreground text-sm">
                <LoaderCircle class="size-4 animate-spin motion-reduce:animate-none" />
                Loading {local.entry.label} Preview
              </div>
            }
          >
            <div class="space-y-4">
              <div>
                <p class="font-medium">Preview could not be loaded.</p>
                <p class="mt-1 text-muted-foreground text-sm">
                  The source and installation details remain available.
                </p>
              </div>
              <div class="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={retry}>
                  <RefreshCcw /> Retry
                </Button>
                <Button
                  as="a"
                  href={`/preview/charts/${local.entry.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink /> Open Preview
                </Button>
              </div>
            </div>
          </Show>
        </div>
      </Show>
      <iframe
        ref={frame}
        src={`/preview/charts/${local.entry.slug}`}
        title={`${local.entry.label} Preview`}
        loading="lazy"
        class="h-full w-full border-0"
        onLoad={sendColorMode}
        onError={() => setState("failed")}
      />
    </div>
  );
}

function ChartSourceActions(props: { entry: ChartCatalogEntry }) {
  const [source, setSource] = createSignal<string>();
  const [sourceError, setSourceError] = createSignal(false);
  const [copied, setCopied] = createSignal<"code" | "install">();
  const [isMobile, setIsMobile] = createSignal(false);
  let sourceAttempt = 0;
  let sourceRequest: Promise<string | undefined> | undefined;

  const ensureSource = () => {
    const cachedSource = source();
    if (cachedSource) {
      setSourceError(false);
      return Promise.resolve(cachedSource);
    }
    if (sourceRequest) return sourceRequest;
    setSourceError(false);
    sourceRequest = (async () => {
      sourceAttempt += 1;
      try {
        const loaded = await loadChartSource(props.entry.slug, sourceAttempt);
        setSource(loaded);
        setSourceError(false);
        return loaded;
      } catch {
        setSourceError(true);
        return undefined;
      } finally {
        sourceRequest = undefined;
      }
    })();
    return sourceRequest;
  };

  const copy = async (kind: "code" | "install") => {
    const value = kind === "code" ? await ensureSource() : props.entry.installCommand;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(), 1_500);
    } catch {
      // Clipboard access can be denied without turning the handled action into
      // an unhandled rejection.
    }
  };

  onMount(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    onCleanup(() => query.removeEventListener("change", update));
  });

  return (
    <div class="flex flex-wrap items-center gap-2" data-chart-actions>
      <Button size="sm" variant="outline" onClick={() => void copy("code")}>
        <FileCode2 /> {copied() === "code" ? "Copied" : "Copy Code"}
      </Button>
      <Sheet onOpenChange={(open) => open && void ensureSource()}>
        <SheetTrigger as={Button} size="sm" variant="outline">
          <FileCode2 /> View Code
        </SheetTrigger>
        <SheetContent
          side={isMobile() ? "bottom" : "right"}
          class="max-h-[85svh] w-full md:max-h-svh md:w-[min(700px,90vw)] md:max-w-none!"
        >
          <SheetHeader class="border-b pr-14">
            <SheetTitle>{props.entry.label} source</SheetTitle>
            <SheetDescription>
              Complete Solid source and independent registry installation.
            </SheetDescription>
          </SheetHeader>
          <div class="flex flex-wrap gap-2 px-4">
            <Button size="sm" onClick={() => void copy("code")} disabled={!source()}>
              <FileCode2 /> {copied() === "code" ? "Copied" : "Copy source"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void copy("install")}>
              <Terminal /> {copied() === "install" ? "Copied" : "Copy install command"}
            </Button>
          </div>
          <div class="mx-4 rounded-lg border bg-muted/40 p-3 font-mono text-xs">
            {props.entry.installCommand}
          </div>
          <Show
            when={!sourceError()}
            fallback={
              <div class="m-4 space-y-3 text-destructive text-sm" role="alert">
                <p>Source failed to load.</p>
                <Button size="sm" variant="outline" onClick={() => void ensureSource()}>
                  <RefreshCcw /> Retry source
                </Button>
              </div>
            }
          >
            <pre class="m-4 mt-0 min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed">
              <code>{source() ?? "Loading source…"}</code>
            </pre>
          </Show>
        </SheetContent>
      </Sheet>
      <Button
        as="a"
        href={`/preview/charts/${props.entry.slug}`}
        target="_blank"
        rel="noreferrer"
        size="sm"
        variant="outline"
      >
        <ExternalLink /> Open Preview
      </Button>
      <Button
        as="a"
        href={props.entry.sourceUrl}
        target="_blank"
        rel="noreferrer"
        size="sm"
        variant="ghost"
      >
        Source
      </Button>
    </div>
  );
}

type ChartFamily = "area" | "radar" | "tooltip";

const familyCatalog = {
  area: {
    label: "Area",
    heading: "Area Charts",
    path: "/charts",
    entries: AREA_CHARTS,
  },
  radar: {
    label: "Radar",
    heading: "Radar Charts",
    path: "/charts/radar",
    entries: RADAR_CHARTS,
  },
  tooltip: {
    label: "Tooltips",
    heading: "Tooltip Charts",
    path: "/charts/tooltip",
    entries: TOOLTIP_CHARTS,
  },
} as const;

export function ChartCatalog(props: { family?: ChartFamily }) {
  const catalog = () => familyCatalog[props.family ?? "area"];

  return (
    <main data-product-surface="charts" data-canonical-route={catalog().path}>
      <header class="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center md:py-24">
        <p class="font-medium text-muted-foreground text-sm">Chart Catalog</p>
        <h1 class="text-balance font-heading font-semibold text-4xl tracking-tight md:text-5xl">
          Beautiful Charts &amp; Graphs
        </h1>
        <p class="max-w-2xl text-balance text-muted-foreground md:text-lg">
          Composable SolidJS charts built with solid-recharts and independently installable from the
          Zaidan registry.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <Button as="a" href="#charts">
            Browse Charts
          </Button>
          <Button as="a" href="/components/chart" variant="outline">
            Documentation
          </Button>
        </div>
      </header>

      <nav
        aria-label="Chart families"
        class="sticky top-(--product-header-height) z-30 border-y bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80"
      >
        <div class="no-scrollbar mx-auto flex max-w-7xl overflow-x-auto px-4">
          <For each={CHART_FAMILIES}>
            {(family) => (
              <a
                href={`${family.path}#charts`}
                aria-current={family.label === catalog().label ? "page" : undefined}
                class={cn(
                  "shrink-0 border-transparent border-b-2 px-4 py-3 font-medium text-muted-foreground text-sm hover:text-foreground",
                  family.label === catalog().label && "border-foreground text-foreground",
                )}
              >
                {family.label}
              </a>
            )}
          </For>
        </div>
      </nav>

      <section
        id="charts"
        aria-labelledby={`${props.family ?? "area"}-charts-heading`}
        class="scroll-mt-28 px-4 py-10 md:px-6"
      >
        <div class="mx-auto max-w-7xl">
          <div class="mb-8">
            <h2
              id={`${props.family ?? "area"}-charts-heading`}
              class="font-heading font-semibold text-3xl tracking-tight"
            >
              {catalog().heading}
            </h2>
            <p class="mt-2 text-muted-foreground">
              {catalog().entries.length} source-pinned {catalog().label} Chart Catalog Entries.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <For each={catalog().entries}>
              {(entry) => (
                <article
                  id={entry.slug}
                  class={cn(
                    "overflow-hidden rounded-xl border bg-card shadow-sm",
                    entry.interactive && "md:col-span-2 lg:col-span-3",
                  )}
                  data-chart-entry={entry.slug}
                >
                  <div class="flex flex-col gap-4 p-5">
                    <div>
                      <p class="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                        {catalog().label === "Tooltips" ? "Tooltip" : catalog().label}
                      </p>
                      <h3 class="mt-1 font-heading font-semibold text-xl">{entry.label}</h3>
                      <p class="mt-1 text-muted-foreground text-sm">{entry.description}</p>
                    </div>
                    <ChartSourceActions entry={entry} />
                  </div>
                  <ChartPreview entry={entry} />
                </article>
              )}
            </For>
          </div>
        </div>
      </section>
    </main>
  );
}

import { createFileRoute, notFound } from "@tanstack/solid-router";
import type { Component } from "solid-js";
import { createSignal, lazy, onCleanup, onMount, Show, Suspense } from "solid-js";
import { getAreaChart } from "@/lib/chart-catalog";
import { resolvePreviewRequest } from "@/lib/product-routing";
import { createPreviewHead } from "@/lib/seo";

type ChartModule = Record<string, Component>;

const chartLoaders = import.meta.glob<ChartModule>("../registry/kobalte/charts/*.tsx");

export const Route = createFileRoute("/preview/charts/$slug")({
  headers: () => ({ "X-Robots-Tag": "noindex, follow" }),
  loader: ({ location }) => {
    const resolution = resolvePreviewRequest(
      `${location.pathname}${location.searchStr}${location.hash}`,
    );
    if (!resolution.accepted || resolution.kind !== "charts") throw notFound();
    return resolution;
  },
  head: () =>
    createPreviewHead({
      title: "Chart Preview",
      description: "Isolated Chart Catalog Preview.",
      canonicalPath: "/charts",
    }),
  component: ChartPreview,
});

function ChartPreview() {
  const [mounted, setMounted] = createSignal(false);
  const params = Route.useParams();
  const entry = getAreaChart(params().slug);
  if (!entry) throw notFound();

  const loader = chartLoaders[`../registry/kobalte/charts/${entry.slug}.tsx`];
  if (!loader) throw notFound();

  const Chart = lazy(async () => {
    const module = await loader();
    const component = module[entry.exportName];
    if (!component) throw new TypeError(`Missing chart export ${entry.exportName}`);
    return { default: component };
  });

  const applyColorMode = (mode: "light" | "dark") => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
    document.documentElement.dataset.kbTheme = mode;
  };

  onMount(() => {
    setMounted(true);
    applyColorMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const receiveMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "color-mode-sync" ||
        !["light", "dark"].includes(event.data.data)
      ) {
        return;
      }
      applyColorMode(event.data.data);
    };
    window.addEventListener("message", receiveMessage);
    onCleanup(() => window.removeEventListener("message", receiveMessage));
  });

  return (
    <main
      data-preview-kind="charts"
      data-preview-slug={entry.slug}
      class="grid min-h-svh place-items-center p-4 md:p-8"
    >
      <Show
        when={mounted()}
        fallback={
          <div role="status" aria-live="polite" class="text-muted-foreground text-sm">
            Loading {entry.label} Preview
          </div>
        }
      >
        <Suspense
          fallback={
            <div role="status" aria-live="polite" class="text-muted-foreground text-sm">
              Loading {entry.label} Preview
            </div>
          }
        >
          <div class="w-full max-w-5xl">
            <Chart />
            <PreviewReady />
          </div>
        </Suspense>
      </Show>
    </main>
  );
}

function PreviewReady() {
  onMount(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "chart-preview-ready" }, window.location.origin);
    }
  });
  return null;
}

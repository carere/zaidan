import { createFileRoute, notFound } from "@tanstack/solid-router";
import { lazy, onCleanup, onMount } from "solid-js";
import { isChartId, loadChartComponent } from "@/lib/charts";
import type { IframeMessage } from "@/lib/types";

export const Route = createFileRoute("/preview/charts/$name")({
  loader: ({ params }) => {
    if (!isChartId(params.name)) throw notFound();
    return params.name;
  },
  component: ChartPreview,
});

function ChartPreview() {
  const params = Route.useParams();
  const Chart = lazy(() => loadChartComponent(params().name));

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data.type === "color-mode-sync") {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(event.data.data);
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(
      { type: "preview-ready" } satisfies IframeMessage,
      window.location.origin,
    );
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  return (
    <main class="flex min-h-svh items-center justify-center bg-background p-3 sm:p-6 **:data-[slot=card]:w-full">
      <Chart />
    </main>
  );
}

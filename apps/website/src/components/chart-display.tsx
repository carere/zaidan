import { useRouter } from "@tanstack/solid-router";
import {
  ChartArea,
  ChartBarBig,
  ChartLine,
  ChartPie,
  Check,
  Copy,
  Hexagon,
  MousePointer2,
  Radar,
  X,
} from "lucide-solid";
import type { Component, ComponentProps } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { TypeScript } from "@/components/icons/typescript";
import type { ChartDefinition, ChartType } from "@/lib/charts";
import type { IframeMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import { Button } from "@/registry/kobalte/ui/button";
import { Separator } from "@/registry/kobalte/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/kobalte/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

const chartIcons: Record<ChartType, Component<ComponentProps<"svg">>> = {
  area: ChartArea,
  bar: ChartBarBig,
  line: ChartLine,
  pie: ChartPie,
  radar: Hexagon,
  radial: Radar,
  tooltip: MousePointer2,
};

const chartTitles: Record<ChartType, string> = {
  area: "Area Chart",
  bar: "Bar Chart",
  line: "Line Chart",
  pie: "Pie Chart",
  radar: "Radar Chart",
  radial: "Radial Chart",
  tooltip: "Tooltip",
};

type ChartDisplayProps = ComponentProps<"article"> & {
  chart: ChartDefinition;
};

export function ChartDisplay(props: ChartDisplayProps) {
  const [local, others] = splitProps(props, ["chart", "class"]);

  return (
    <article
      data-slot="chart-display"
      class={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md",
        local.class,
      )}
      {...others}
    >
      <ChartToolbar chart={local.chart} />
      <ChartPreview chart={local.chart} />
    </article>
  );
}

function ChartPreview(props: { chart: ChartDefinition }) {
  const router = useRouter();
  const { colorMode } = useColorMode();
  let iframeRef: HTMLIFrameElement | undefined;
  const iframeHref = () =>
    router.buildLocation({
      to: "/preview/charts/$name",
      params: { name: props.chart.id },
    }).href;

  const syncColorMode = () => {
    iframeRef?.contentWindow?.postMessage(
      { type: "color-mode-sync", data: colorMode() } satisfies IframeMessage,
      window.location.origin,
    );
  };
  createEffect(syncColorMode);

  onMount(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef?.contentWindow)
        return;
      if (event.data.type === "preview-ready") syncColorMode();
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  return (
    <iframe
      ref={iframeRef}
      data-slot="chart-preview"
      data-chart-id={props.chart.id}
      src={iframeHref()}
      title={`${props.chart.id} preview`}
      onLoad={syncColorMode}
      class="min-h-115 w-full flex-1 border-x-0 border-b-0 border-t bg-background"
    />
  );
}

function ChartToolbar(props: { chart: ChartDefinition }) {
  return (
    <div class="relative z-10 flex h-11 items-center gap-2 px-3">
      <div class="flex items-center gap-1.5 pl-1 text-muted-foreground text-xs">
        <Dynamic component={chartIcons[props.chart.type]} class="size-3.5" />
        {chartTitles[props.chart.type]}
      </div>
      <div class="ml-auto flex items-center gap-2">
        <CopySourceButton chart={props.chart} />
        <Separator orientation="vertical" class="h-4!" />
        <ChartSourceViewer chart={props.chart} />
      </div>
    </div>
  );
}

function CopySourceButton(props: { chart: ChartDefinition }) {
  const [copied, setCopied] = createSignal(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (resetTimer) clearTimeout(resetTimer);
  });

  const copySource = async () => {
    await navigator.clipboard.writeText(props.chart.source);
    setCopied(true);
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        as={Button}
        type="button"
        variant="ghost"
        size="icon-xs"
        class="rounded-md"
        aria-label={`Copy ${props.chart.id} source`}
        onClick={copySource}
      >
        {copied() ? <Check /> : <Copy />}
      </TooltipTrigger>
      <TooltipContent>{copied() ? "Copied!" : "Copy code"}</TooltipContent>
    </Tooltip>
  );
}

function ChartSourceViewer(props: { chart: ChartDefinition }) {
  const [highlightedSource, setHighlightedSource] = createSignal<string>();
  let highlightedSourcePromise: Promise<string> | undefined;

  const loadHighlightedSource = () => {
    highlightedSourcePromise ??= props.chart.loadHighlightedSource().then((source) => {
      setHighlightedSource(source);
      return source;
    });
    return highlightedSourcePromise;
  };

  return (
    <Sheet onOpenChange={(open) => open && void loadHighlightedSource()}>
      <SheetTrigger
        as={Button}
        variant="outline"
        size="xs"
        class="h-7 rounded-md px-2.5"
        onFocus={() => void loadHighlightedSource()}
        onPointerEnter={() => void loadHighlightedSource()}
      >
        View code
      </SheetTrigger>
      <SheetContent
        showCloseButton={false}
        class="flex w-full flex-col gap-0 overflow-hidden border-l-0 p-4 sm:max-w-sm md:w-[700px] md:max-w-[700px] dark:border-l"
      >
        <SheetHeader class="sr-only">
          <SheetTitle>{props.chart.id}.tsx</SheetTitle>
          <SheetDescription>View and copy the code for this chart.</SheetDescription>
        </SheetHeader>
        <Show
          when={highlightedSource()}
          fallback={
            <div class="flex min-h-0 flex-1 items-center justify-center bg-code text-muted-foreground text-sm">
              Loading code…
            </div>
          }
        >
          {(source) => (
            <figure
              data-slot="chart-source-code"
              class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-code text-code-foreground"
            >
              <figcaption class="flex min-h-10 shrink-0 items-center gap-2 border-border/30 border-b px-4">
                <TypeScript aria-hidden="true" class="size-4 shrink-0 opacity-70" />
                <span class="font-mono text-sm">{props.chart.id}.tsx</span>
                <div class="ml-auto flex items-center gap-1">
                  <CopySourceButton chart={props.chart} />
                  <SheetClose
                    as={Button}
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    class="rounded-md"
                  >
                    <X />
                    <span class="sr-only">Close</span>
                  </SheetClose>
                </div>
              </figcaption>
              <div
                data-slot="chart-source-scroll"
                class="no-scrollbar min-h-0 flex-1 overflow-auto"
                // The HTML is generated from trusted local registry source by the build-time highlighter.
                innerHTML={source()}
              />
            </figure>
          )}
        </Show>
      </SheetContent>
    </Sheet>
  );
}

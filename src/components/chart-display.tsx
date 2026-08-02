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
} from "lucide-solid";
import type { Component, ComponentProps } from "solid-js";
import { createEffect, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { ChartDefinition, ChartType } from "@/lib/charts";
import type { IframeMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useColorMode } from "@/registry/kobalte/components/color-mode";
import { Button } from "@/registry/kobalte/ui/button";
import { Separator } from "@/registry/kobalte/ui/separator";
import {
  Sheet,
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
  return (
    <Sheet>
      <SheetTrigger as={Button} variant="outline" size="xs" class="h-7 rounded-md px-2.5">
        View code
      </SheetTrigger>
      <SheetContent class="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader class="border-b px-5 py-4">
          <SheetTitle class="font-mono text-sm">{props.chart.id}.tsx</SheetTitle>
          <SheetDescription>
            Copy and adapt this chart block in your Solid application.
          </SheetDescription>
        </SheetHeader>
        <div class="min-h-0 flex-1 overflow-auto bg-muted/30">
          <pre class="min-w-max p-5 font-mono text-[13px] leading-6">
            <code>{props.chart.source}</code>
          </pre>
        </div>
      </SheetContent>
    </Sheet>
  );
}

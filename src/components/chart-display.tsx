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
import { createSignal, onCleanup, onMount, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { type ChartDefinition, type ChartType, loadChartComponent } from "@/lib/charts";
import { cn } from "@/lib/utils";
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
  const [component, setComponent] = createSignal<Component>();
  const [visible, setVisible] = createSignal(false);
  const [pinned, setPinned] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  let previewRef: HTMLDivElement | undefined;
  let pinTimer: ReturnType<typeof setTimeout> | undefined;
  let requested = false;
  let disposed = false;
  const active = () => visible() || pinned();
  const pinForInteraction = () => {
    if (pinTimer) clearTimeout(pinTimer);
    setPinned(true);
    pinTimer = setTimeout(() => setPinned(false), 2000);
  };

  const load = async () => {
    if (requested) return;
    requested = true;

    try {
      const module = await loadChartComponent(props.chart.id);
      if (disposed) return;
      setComponent(() => module.default);
      requestAnimationFrame(() => {
        if (!disposed) setReady(true);
      });
    } catch {
      if (!disposed) setFailed(true);
    }
  };

  onMount(() => {
    if (!previewRef || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      void load();
      return;
    }

    // Solid Recharts replaces animated SVG nodes every frame. Keeping only the
    // row crossing the viewport center in layout prevents those replacements
    // from invalidating every chart on the page.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry?.isIntersecting ?? false;
        setVisible(isVisible);
        if (isVisible) void load();
      },
      { rootMargin: "-49% 0px -49% 0px" },
    );
    observer.observe(previewRef);
    onCleanup(() => observer.disconnect());
  });
  onCleanup(() => {
    disposed = true;
    if (pinTimer) clearTimeout(pinTimer);
  });

  return (
    <div
      ref={previewRef}
      data-slot="chart-preview"
      data-chart-id={props.chart.id}
      aria-busy={active() && !component() && !failed()}
      onPointerDown={pinForInteraction}
      onFocusIn={pinForInteraction}
      class="flex min-h-115 flex-1 items-center justify-center overflow-hidden border-t bg-background p-3 sm:p-6 **:data-[slot=card]:w-full"
    >
      <Show when={component()} keyed>
        {(Chart) => (
          <div
            class={cn(
              "w-full transition-opacity duration-300",
              active() ? "block" : "hidden",
              ready() ? "opacity-100" : "opacity-0",
            )}
          >
            <Dynamic component={Chart} />
          </div>
        )}
      </Show>
      <Show when={failed()}>
        <p class="text-muted-foreground text-sm">Preview unavailable.</p>
      </Show>
    </div>
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

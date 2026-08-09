import {
  ChevronLeft,
  ChevronRight,
  Container,
  Copy,
  Download,
  Info,
  Monitor,
  MoreHorizontal,
  Plus,
  Server,
  Share,
  Terminal,
  X,
  Zap,
} from "lucide-solid";
import {
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  splitProps,
} from "solid-js";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "solid-recharts";
import { FONTS, STYLES } from "@/lib/config";
import type { DesignSystemConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/kobalte/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/registry/kobalte/ui/chart";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
} from "@/registry/kobalte/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/kobalte/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/kobalte/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { Input } from "@/registry/kobalte/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/kobalte/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/registry/kobalte/ui/item";
import { Progress } from "@/registry/kobalte/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kobalte/ui/select";
import { Separator } from "@/registry/kobalte/ui/separator";
import { Slider } from "@/registry/kobalte/ui/slider";
import { Spinner } from "@/registry/kobalte/ui/spinner";
import { Switch } from "@/registry/kobalte/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { Textarea } from "@/registry/kobalte/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/registry/kobalte/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/kobalte/ui/tooltip";

const barChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];
const barChartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;
const desktopTotal = barChartData.reduce((sum, item) => sum + item.desktop, 0);
const mobileTotal = barChartData.reduce((sum, item) => sum + item.mobile, 0);
const desktopDelta = Math.round(((desktopTotal - mobileTotal) / mobileTotal) * 100);

export function BarChartCard(props: { config: DesignSystemConfig }) {
  const isRounded = () => !["lyra", "sera"].includes(props.config.style);
  return (
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Traffic channels</CardTitle>
        <CardDescription class="line-clamp-2 text-sm leading-snug">
          Monthly desktop and mobile traffic for the last six months—compare volume and mix across
          platforms and devices at a glance.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4 pt-0">
        <ChartContainer config={barChartConfig} class="max-h-[180px] w-full">
          <BarChart
            accessibilityLayer
            data={barChartData}
            margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke-dasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              tickFormatter={(value) => String(value).slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="desktop"
              fill="var(--color-desktop)"
              radius={isRounded() ? [6, 6, 0, 0] : 0}
            />
            <Bar
              dataKey="mobile"
              fill="var(--color-mobile)"
              radius={isRounded() ? [6, 6, 0, 0] : 0}
            />
          </BarChart>
        </ChartContainer>
        <div class="grid w-full grid-cols-3 divide-x divide-border/60">
          <For
            each={[
              ["Desktop", desktopTotal.toLocaleString()],
              ["Mobile", mobileTotal.toLocaleString()],
              ["Mix Delta", `${desktopDelta > 0 ? "+" : ""}${desktopDelta}%`],
            ]}
          >
            {(metric) => (
              <div class="px-2 text-center">
                <div class="text-[0.65rem] text-muted-foreground uppercase">{metric[0]}</div>
                <div class="font-medium text-sm tabular-nums">{metric[1]}</div>
              </div>
            )}
          </For>
        </div>
      </CardContent>
      <CardFooter>
        <Button class="w-full">View report</Button>
      </CardFooter>
    </Card>
  );
}

export function CodespacesCard() {
  const [creating, setCreating] = createSignal(false);

  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="codespaces">
          <TabsList class="w-full">
            <TabsTrigger value="codespaces">Codespaces</TabsTrigger>
            <TabsTrigger value="local">Local</TabsTrigger>
          </TabsList>
          <TabsContent value="codespaces">
            <Item size="sm" class="px-1 pt-2">
              <ItemContent>
                <ItemTitle>Codespaces</ItemTitle>
                <ItemDescription>Your workspaces in the cloud</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Tooltip>
                  <TooltipTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Create a codespace on main"
                  >
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Create a codespace on main</TooltipContent>
                </Tooltip>
                <DropdownMenu placement="bottom-end">
                  <DropdownMenuTrigger
                    as={Button}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Codespace options"
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Plus /> New with options...
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Container /> Configure container
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Zap /> Set up prebuilds
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <Server /> Manage codespaces
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share /> Share deep link
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Info /> What are codespaces?
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            </Item>
            <Separator class="-mx-2 my-2 w-auto!" />
            <Empty class="p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Server />
                </EmptyMedia>
                <EmptyTitle>No codespaces</EmptyTitle>
                <EmptyDescription>
                  You don&apos;t have any codespaces with this repository checked out
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  size="sm"
                  disabled={creating()}
                  onClick={() => {
                    setCreating(true);
                    window.setTimeout(() => setCreating(false), 2000);
                  }}
                >
                  <Show when={creating()}>
                    <Spinner data-icon="inline-start" />
                  </Show>
                  Create Codespace
                </Button>
                <a
                  href="#learn-more"
                  class="text-muted-foreground text-xs underline underline-offset-4"
                >
                  Learn more about codespaces
                </a>
              </EmptyContent>
            </Empty>
            <Separator class="-mx-2 my-2 w-auto!" />
            <div class="p-1.5 text-muted-foreground text-xs">
              Codespace usage for this repository is paid for by{" "}
              <span class="font-medium">shadcn</span>.
            </div>
          </TabsContent>
          <TabsContent value="local">
            <Item size="sm" class="hidden p-0">
              <ItemContent>
                <ItemTitle class="gap-2">
                  <Terminal class="size-4" /> Clone
                </ItemTitle>
              </ItemContent>
              <ItemActions>
                <Tooltip>
                  <TooltipTrigger
                    as={Button}
                    variant="ghost"
                    size="icon"
                    aria-label="Remote URL help"
                  >
                    <Info />
                  </TooltipTrigger>
                  <TooltipContent side="left">Which remote URL should I use?</TooltipContent>
                </Tooltip>
              </ItemActions>
            </Item>
            <Tabs defaultValue="https">
              <TabsList variant="line" class="w-full justify-start border-b *:[button]:flex-0">
                <TabsTrigger value="https">HTTPS</TabsTrigger>
                <TabsTrigger value="ssh">SSH</TabsTrigger>
                <TabsTrigger value="cli">GitHub CLI</TabsTrigger>
              </TabsList>
              <div class="rounded-md border bg-muted/30 p-2">
                <For
                  each={[
                    {
                      description: "Clone using the web URL.",
                      id: "https-url",
                      label: "HTTPS URL",
                      value: "https://github.com/shadcn-ui/ui.git",
                    },
                    {
                      description: "Use a password-protected SSH key.",
                      id: "ssh-url",
                      label: "SSH URL",
                      value: "git@github.com:shadcn-ui/ui.git",
                    },
                    {
                      description: "Work fast with our official CLI.",
                      id: "cli-command",
                      label: "CLI Command",
                      value: "gh repo clone shadcn-ui/ui",
                    },
                  ]}
                >
                  {(clone, index) => (
                    <TabsContent value={["https", "ssh", "cli"][index()] ?? "https"}>
                      <Field class="gap-2">
                        <FieldLabel for={clone.id} class="sr-only">
                          {clone.label}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Copy ${clone.label}`}
                            >
                              <Copy />
                            </InputGroupButton>
                          </InputGroupAddon>
                          <InputGroupInput id={clone.id} value={clone.value} readOnly />
                        </InputGroup>
                        <FieldDescription>{clone.description}</FieldDescription>
                      </Field>
                    </TabsContent>
                  )}
                </For>
              </div>
            </Tabs>
            <Separator class="-mx-2 my-2 w-auto!" />
            <div class="flex flex-col">
              <Button variant="ghost" size="sm" class="justify-start gap-1.5">
                <Monitor data-icon="inline-start" /> Open with GitHub Desktop
              </Button>
              <Button variant="ghost" size="sm" class="justify-start gap-1.5">
                <Download data-icon="inline-start" /> Download ZIP
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

const payoutCurrencies = [
  { label: "USD — United States Dollar", value: "usd" },
  { label: "EUR — Euro", value: "eur" },
  { label: "GBP — British Pound", value: "gbp" },
  { label: "JPY — Japanese Yen", value: "jpy" },
];

export function PayoutThresholdCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Threshold</CardTitle>
        <CardDescription>
          Set the minimum balance required before a payout is triggered.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            class="bg-muted"
            aria-label="Dismiss payout threshold"
          >
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="preferred-currency">Preferred Currency</FieldLabel>
            <Select items={payoutCurrencies} defaultValue="usd">
              <SelectTrigger id="preferred-currency" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <For each={payoutCurrencies}>
                    {(currency) => <SelectItem value={currency.value}>{currency.label}</SelectItem>}
                  </For>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <div class="flex items-baseline justify-between">
              <FieldLabel id="min-payout-label">Minimum Payout Amount</FieldLabel>
              <span class="font-semibold text-2xl tabular-nums">$2500.00</span>
            </div>
            <Progress
              value={25}
              aria-label="Minimum payout amount"
              aria-valuetext="$2,500 of $10,000"
            />
            <div class="flex items-center justify-between">
              <FieldDescription>$50 (MIN)</FieldDescription>
              <FieldDescription>$10,000 (MAX)</FieldDescription>
            </div>
          </Field>
          <Field>
            <FieldLabel for="payout-notes">Notes</FieldLabel>
            <Textarea
              id="payout-notes"
              placeholder="Add any notes for this payout configuration..."
              class="min-h-[100px]"
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button class="w-full">Save Threshold</Button>
      </CardFooter>
    </Card>
  );
}

type LiveWaveformProps = ComponentProps<"div"> & {
  active?: boolean;
  barColor?: string;
  barGap?: number;
  barHeight?: number;
  barRadius?: number;
  barWidth?: number;
  deviceId?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  fftSize?: number;
  height?: number | string;
  historySize?: number;
  mode?: "scrolling" | "static";
  onError?: (error: Error) => void;
  onStreamEnd?: () => void;
  onStreamReady?: (stream: MediaStream) => void;
  processing?: boolean;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  updateRate?: number;
};

function LiveWaveform(props: LiveWaveformProps) {
  const [local, others] = splitProps(props, [
    "active",
    "barColor",
    "barGap",
    "barHeight",
    "barRadius",
    "barWidth",
    "class",
    "deviceId",
    "fadeEdges",
    "fadeWidth",
    "fftSize",
    "height",
    "historySize",
    "mode",
    "onError",
    "onStreamEnd",
    "onStreamReady",
    "processing",
    "sensitivity",
    "smoothingTimeConstant",
    "updateRate",
  ]);
  const active = () => local.active ?? false;
  const processing = () => local.processing ?? false;
  const mode = () => local.mode ?? "static";
  const barWidth = () => local.barWidth ?? 3;
  const barGap = () => local.barGap ?? 1;
  const barHeight = () => local.barHeight ?? 4;
  const barRadius = () => local.barRadius ?? 1.5;
  const height = () =>
    typeof local.height === "number" ? `${local.height}px` : (local.height ?? "64px");
  let container: HTMLDivElement | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let analyser: AnalyserNode | undefined;
  let audioContext: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let animationFrame = 0;
  let lastUpdate = 0;
  let bars: number[] = [];
  let setupVersion = 0;

  const stopStream = () => {
    setupVersion += 1;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = undefined;
      local.onStreamEnd?.();
    }
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
    audioContext = undefined;
    analyser = undefined;
  };

  createEffect(() => {
    if (!active()) {
      stopStream();
      return;
    }

    const version = ++setupVersion;
    if (!navigator.mediaDevices) {
      local.onError?.(new Error("Audio input is not available in this browser."));
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({
        audio: local.deviceId
          ? {
              autoGainControl: true,
              deviceId: { exact: local.deviceId },
              echoCancellation: true,
              noiseSuppression: true,
            }
          : { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
      })
      .then((nextStream) => {
        if (version !== setupVersion || !active()) {
          for (const track of nextStream.getTracks()) track.stop();
          return;
        }
        stream = nextStream;
        local.onStreamReady?.(nextStream);
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = local.fftSize ?? 256;
        analyser.smoothingTimeConstant = local.smoothingTimeConstant ?? 0.8;
        audioContext.createMediaStreamSource(nextStream).connect(analyser);
        bars = [];
      })
      .catch((error: unknown) =>
        local.onError?.(error instanceof Error ? error : new Error(String(error))),
      );

    onCleanup(stopStream);
  });

  onMount(() => {
    if (!container || !canvas) return;
    const resize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const animate = (time: number) => {
      if (!canvas) return;
      const context = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      if (!context || rect.width === 0 || rect.height === 0) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      const step = barWidth() + barGap();
      const barCount = Math.floor(rect.width / step);

      if (active() && analyser && time - lastUpdate > (local.updateRate ?? 30)) {
        lastUpdate = time;
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        const relevant = frequencyData.slice(
          Math.floor(frequencyData.length * 0.05),
          Math.floor(frequencyData.length * 0.4),
        );
        if (mode() === "static") {
          const half = Math.floor(barCount / 2);
          const side = Array.from({ length: half }, (_, index) => {
            const dataIndex = Math.floor((index / Math.max(half, 1)) * relevant.length);
            return Math.max(
              0.05,
              Math.min(1, ((relevant[dataIndex] ?? 0) / 255) * (local.sensitivity ?? 1)),
            );
          });
          bars = [...[...side].reverse(), ...side];
        } else {
          const average =
            relevant.reduce((sum, value) => sum + value, 0) / Math.max(relevant.length, 1) / 255;
          bars.push(Math.min(1, Math.max(0.05, average * (local.sensitivity ?? 1))));
          if (bars.length > (local.historySize ?? 60)) bars.shift();
        }
      } else if (processing() && !active()) {
        bars = Array.from({ length: barCount }, (_, index) => {
          const position = (index - barCount / 2) / Math.max(barCount / 2, 1);
          const centerWeight = 1 - Math.abs(position) * 0.4;
          return Math.max(
            0.05,
            Math.min(
              1,
              (0.2 +
                Math.sin(time * 0.0015 + position * 3) * 0.25 +
                Math.sin(time * 0.0008 - position * 2) * 0.2 +
                Math.cos(time * 0.002 + position) * 0.15) *
                centerWeight,
            ),
          );
        });
      } else if (!active()) {
        bars = bars.map((value) => value * 0.92).filter((value) => value > 0.05);
      }

      context.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      const centerY = rect.height / 2;
      const computedColor = local.barColor ?? getComputedStyle(canvas).color ?? "#000";
      const visibleBars = mode() === "scrolling" ? [...bars].reverse() : bars;
      for (let index = 0; index < Math.min(barCount, visibleBars.length); index += 1) {
        const value = visibleBars[index] ?? 0.05;
        const x = mode() === "scrolling" ? rect.width - (index + 1) * step : index * step;
        const nextHeight = Math.max(barHeight(), value * rect.height * 0.8);
        context.fillStyle = computedColor;
        context.globalAlpha = 0.4 + value * 0.6;
        context.beginPath();
        context.roundRect(x, centerY - nextHeight / 2, barWidth(), nextHeight, barRadius());
        context.fill();
      }
      if ((local.fadeEdges ?? true) && (local.fadeWidth ?? 24) > 0) {
        const gradient = context.createLinearGradient(0, 0, rect.width, 0);
        const fadePercent = Math.min(0.3, (local.fadeWidth ?? 24) / rect.width);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(fadePercent, "rgba(255,255,255,0)");
        gradient.addColorStop(1 - fadePercent, "rgba(255,255,255,0)");
        gradient.addColorStop(1, "rgba(255,255,255,1)");
        context.globalCompositeOperation = "destination-out";
        context.globalAlpha = 1;
        context.fillStyle = gradient;
        context.fillRect(0, 0, rect.width, rect.height);
        context.globalCompositeOperation = "source-over";
      }
      context.globalAlpha = 1;
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    onCleanup(() => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
      stopStream();
    });
  });

  return (
    <div
      {...others}
      ref={container}
      class={cn("relative h-full w-full", local.class)}
      style={{ height: height() }}
      aria-label={
        active() ? "Live audio waveform" : processing() ? "Processing audio" : "Audio waveform idle"
      }
      role="img"
    >
      <Show when={!active() && !processing()}>
        <div class="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-muted-foreground/20 border-t-2 border-dotted" />
      </Show>
      <canvas ref={canvas} class="block h-full w-full" />
    </div>
  );
}

export function LiveWaveformCard() {
  const [active, setActive] = createSignal(false);
  const [processing, setProcessing] = createSignal(true);
  const [mode, setMode] = createSignal<"static" | "scrolling">("static");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Audio Waveform</CardTitle>
        <CardDescription>
          Real-time microphone input visualization with audio reactivity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LiveWaveform
          active={active()}
          processing={processing()}
          height={80}
          barWidth={3}
          barGap={2}
          mode={mode()}
          fadeEdges
          barColor="gray"
          historySize={120}
        />
      </CardContent>
      <CardFooter class="gap-2">
        <Button
          size="sm"
          variant={active() ? "default" : "outline"}
          onClick={() => {
            const next = !active();
            setActive(next);
            if (next) setProcessing(false);
          }}
        >
          {active() ? "Stop" : "Start"} Listening
        </Button>
        <Button
          size="sm"
          variant={processing() ? "default" : "outline"}
          onClick={() => {
            const next = !processing();
            setProcessing(next);
            if (next) setActive(false);
          }}
        >
          {processing() ? "Stop" : "Start"} Processing
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMode((value) => (value === "static" ? "scrolling" : "static"))}
        >
          {mode() === "static" ? "Static" : "Scrolling"}
        </Button>
      </CardFooter>
    </Card>
  );
}

const colorTokens = [
  "--background",
  "--foreground",
  "--primary",
  "--secondary",
  "--muted",
  "--accent",
  "--border",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
];

export function StyleOverview(props: { config: DesignSystemConfig }) {
  const currentFont = () => FONTS.find((font) => font.value === props.config.font);
  const currentHeadingFont = () => FONTS.find((font) => font.value === props.config.headingFont);
  const currentStyle = () => STYLES.find((style) => style.name === props.config.style);

  return (
    <Card>
      <CardContent class="flex flex-col gap-6 style-lyra:gap-4 style-mira:gap-4">
        <div class="flex flex-col gap-1">
          <div class="z-font-heading text-2xl font-medium style-lyra:text-lg style-mira:text-lg style-sera:text-lg style-sera:font-semibold style-sera:tracking-wide style-sera:uppercase">
            {currentStyle()?.label} - {currentHeadingFont()?.label ?? currentFont()?.label}
          </div>
          <div class="line-clamp-2 text-base text-muted-foreground style-lyra:text-sm style-mira:text-sm style-sera:text-sm style-sera:leading-relaxed">
            Designers love packing quirky glyphs into test phrases. This is a preview of the
            typography styles.
          </div>
        </div>
        <div class="grid grid-cols-6 gap-3">
          <For each={colorTokens}>
            {(token) => (
              <div class="flex flex-col flex-wrap items-center gap-2">
                <div
                  class="relative aspect-square w-full rounded-lg bg-(--color) after:absolute after:inset-0 after:rounded-lg after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten style-sera:rounded-none style-sera:after:rounded-none"
                  style={{ "--color": `var(${token})` }}
                />
                <div class="hidden max-w-14 truncate font-mono text-[0.60rem] md:block style-lyra:max-w-10 style-mira:max-w-10">
                  {token}
                </div>
              </div>
            )}
          </For>
        </div>
      </CardContent>
    </Card>
  );
}

export function TypographySpecimen(props: { config: DesignSystemConfig }) {
  const bodyFont = () => FONTS.find((font) => font.value === props.config.font)?.label ?? "Default";
  const headingFont = () =>
    FONTS.find((font) => font.value === props.config.headingFont)?.label ?? "Inherit";
  const categories = [
    { label: "General", value: "general" },
    { label: "Bug Report", value: "bug" },
    { label: "Feature Request", value: "feature" },
    { label: "Improvement", value: "improvement" },
  ];

  return (
    <Card>
      <CardContent class="flex flex-col gap-2">
        <div class="font-medium text-muted-foreground text-xs uppercase">
          {headingFont()} - {bodyFont()}
        </div>
        <p class="z-font-heading text-2xl font-medium style-sera:text-lg style-sera:font-semibold style-sera:tracking-wider style-sera:uppercase">
          Designing with rhythm and hierarchy.
        </p>
        <p class="text-muted-foreground text-sm leading-relaxed">
          A strong body style keeps long-form content readable and balances the visual weight of
          headings.
        </p>
        <p class="text-muted-foreground text-sm leading-relaxed">
          Thoughtful spacing and cadence help paragraphs scan quickly without feeling dense.
        </p>
      </CardContent>
      <CardFooter>
        <Dialog>
          <DialogTrigger as={Button} variant="outline" class="w-full">
            Share Feedback
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Feedback</DialogTitle>
              <DialogDescription>Let us know how we can improve your experience.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <div class="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel for="feedback-name">Name</FieldLabel>
                  <Input id="feedback-name" placeholder="Your name" />
                </Field>
                <Field>
                  <FieldLabel for="feedback-email">Email</FieldLabel>
                  <Input id="feedback-email" type="email" placeholder="you@example.com" />
                </Field>
              </div>
              <Field>
                <FieldLabel for="feedback-category">Category</FieldLabel>
                <Select items={categories} defaultValue="general">
                  <SelectTrigger id="feedback-category" class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <For each={categories}>
                        {(category) => (
                          <SelectItem value={category.value}>{category.label}</SelectItem>
                        )}
                      </For>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel for="feedback-message">Message</FieldLabel>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what's on your mind..."
                  class="min-h-24 resize-none"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose as={Button} variant="outline">
                Cancel
              </DialogClose>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

const scenes = {
  cooking: [90, 70, 30, 0],
  dining: [55, 45, 20, 25],
  nightlight: [15, 20, 0, 80],
  focus: [100, 85, 0, 0],
} as const;

export function KitchenIsland() {
  const [enabled, setEnabled] = createSignal(true);
  const [scene, setScene] = createSignal<keyof typeof scenes>("cooking");
  const [brightness, setBrightness] = createSignal<number[]>([90]);
  const [colorTemp, setColorTemp] = createSignal<number[]>([70]);
  const [volume, setVolume] = createSignal<number[]>([30]);
  const [fade, setFade] = createSignal<number[]>([0]);
  const applyScene = (value: keyof typeof scenes) => {
    setScene(value);
    const next = scenes[value];
    setBrightness([next[0]]);
    setColorTemp([next[1]]);
    setVolume([next[2]]);
    setFade([next[3]]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kitchen Island</CardTitle>
        <CardDescription>Hue Color Ambient</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm">Power</span>
          <Switch aria-label="Kitchen island power" checked={enabled()} onChange={setEnabled} />
        </div>
        <ToggleGroup
          value={scene()}
          onChange={(value) => applyScene((value ?? "cooking") as keyof typeof scenes)}
          class="grid grid-cols-2"
        >
          <For each={Object.keys(scenes) as (keyof typeof scenes)[]}>
            {(name) => (
              <ToggleGroupItem value={name} disabled={!enabled()} class="capitalize">
                {name}
              </ToggleGroupItem>
            )}
          </For>
        </ToggleGroup>
        <For
          each={
            [
              ["Brightness", brightness, setBrightness],
              ["Color temperature", colorTemp, setColorTemp],
              ["Volume", volume, setVolume],
              ["Fade", fade, setFade],
            ] as const
          }
        >
          {([label, value, setter]) => (
            <Field>
              <div class="flex justify-between">
                <FieldLabel>{label}</FieldLabel>
                <span class="text-muted-foreground text-xs">{value()[0]}%</span>
              </div>
              <Slider
                aria-label={label}
                value={value()}
                onChange={(next) => setter(next)}
                disabled={!enabled()}
              />
            </Field>
          )}
        </For>
      </CardContent>
    </Card>
  );
}

export function RollerShades() {
  const [position, setPosition] = createSignal<number[]>([50]);
  const preset = createMemo(() =>
    position()[0] <= 10 ? "open" : position()[0] >= 90 ? "closed" : "half",
  );
  const positions = { open: 0, half: 50, closed: 100 } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Living Room</CardTitle>
        <CardDescription>Roller Shades</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground text-sm">Position</span>
          <span class="font-medium tabular-nums">{position()[0]}%</span>
        </div>
        <Slider
          aria-label="Shade position"
          value={position()}
          onChange={(value) => setPosition(value)}
        />
        <ToggleGroup
          value={preset()}
          onChange={(value) =>
            setPosition([positions[(value ?? "half") as keyof typeof positions]])
          }
          class="flex"
        >
          <ToggleGroupItem value="open" class="flex-1">
            Open
          </ToggleGroupItem>
          <ToggleGroupItem value="half" class="flex-1">
            Half
          </ToggleGroupItem>
          <ToggleGroupItem value="closed" class="flex-1">
            Closed
          </ToggleGroupItem>
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}

const tickers = ["VOO", "VIG", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
const stockData: Record<string, { month: string; price: number }[]> = {
  VOO: [
    { month: "Jan", price: 412 },
    { month: "Feb", price: 438 },
    { month: "Mar", price: 395 },
    { month: "Apr", price: 450 },
    { month: "May", price: 420 },
    { month: "Jun", price: 462 },
  ],
  AAPL: [
    { month: "Jan", price: 185 },
    { month: "Feb", price: 210 },
    { month: "Mar", price: 172 },
    { month: "Apr", price: 198 },
    { month: "May", price: 178 },
    { month: "Jun", price: 215 },
  ],
};
const defaultStockData = [
  { month: "Jan", price: 100 },
  { month: "Feb", price: 118 },
  { month: "Mar", price: 95 },
  { month: "Apr", price: 125 },
  { month: "May", price: 108 },
  { month: "Jun", price: 130 },
];
const stockChartConfig = {
  price: { label: "Price", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function StockPerformance() {
  const [ticker, setTicker] = createSignal("VOO");
  const data = createMemo(() => stockData[ticker()] ?? defaultStockData);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Performance</CardTitle>
        <CardDescription>6-month price history.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel for="ticker-select">Ticker</FieldLabel>
            <Combobox
              options={tickers}
              value={ticker()}
              onChange={(value) => value && setTicker(value)}
              itemComponent={(itemProps) => (
                <ComboboxItem item={itemProps.item}>{itemProps.item.rawValue}</ComboboxItem>
              )}
            >
              <ComboboxInput id="ticker-select" placeholder="Search ticker..." />
              <ComboboxContent>
                <ComboboxEmpty>No tickers found.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>
        </FieldGroup>
        <Separator class="style-sera:hidden" />
        <ChartContainer config={stockChartConfig} class="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={data()}
            margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-price)" stop-opacity={0.3} />
                <stop offset="100%" stop-color="var(--color-price)" stop-opacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke-dasharray="3 3" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--color-price)"
              strokeWidth={2}
              fill="url(#fillPrice)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function UpcomingPayments() {
  const [date, setDate] = createSignal<Date>();
  const [monthOffset, setMonthOffset] = createSignal(0);
  const calendarMonth = createMemo(() => new Date(2026, 7 + monthOffset(), 1));
  const calendarLabel = createMemo(() =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth()),
  );
  const calendarDays = createMemo(() => {
    const month = calendarMonth();
    const firstDay = month.getDay();
    return Array.from(
      { length: 42 },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1),
    );
  });
  const isSelected = (day: Date) => {
    const selected = date();
    return (
      selected?.getFullYear() === day.getFullYear() &&
      selected.getMonth() === day.getMonth() &&
      selected.getDate() === day.getDate()
    );
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Payments</CardTitle>
        <CardDescription>Select a date to view scheduled payments.</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <Item variant="outline" class="justify-center">
          <div class="w-full p-3">
            <div class="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Go to the previous month"
                onClick={() => setMonthOffset((offset) => offset - 1)}
              >
                <ChevronLeft />
              </Button>
              <span class="font-medium text-sm" aria-live="polite">
                {calendarLabel()}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Go to the next month"
                onClick={() => setMonthOffset((offset) => offset + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
            <table class="w-full border-collapse text-center text-sm">
              <caption class="sr-only">{calendarLabel()}</caption>
              <thead>
                <tr class="text-muted-foreground">
                  <For each={["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]}>
                    {(weekday) => <th class="h-8 font-normal">{weekday}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={[0, 1, 2, 3, 4, 5]}>
                  {(week) => (
                    <tr>
                      <For each={calendarDays().slice(week * 7, week * 7 + 7)}>
                        {(day) => (
                          <td class="p-0.5">
                            <button
                              type="button"
                              aria-label={day.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                              aria-pressed={isSelected(day)}
                              class="size-8 rounded-md text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:size-10"
                              classList={{
                                "bg-primary text-primary-foreground": isSelected(day),
                                "text-muted-foreground":
                                  day.getMonth() !== calendarMonth().getMonth(),
                              }}
                              onClick={() => setDate(day)}
                            >
                              {day.getDate()}
                            </button>
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Item>
        <ItemGroup role="group" class="w-full">
          <For
            each={[
              ["Netflix Subscription", "Apr 15, 2024", "$19.99"],
              ["Rent Payment", "Apr 1, 2024", "$2,400.00"],
              ["Auto Insurance", "Apr 22, 2024", "$186.00"],
            ]}
          >
            {(payment) => (
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle>{payment[0]}</ItemTitle>
                  <ItemDescription>{payment[1]}</ItemDescription>
                </ItemContent>
                <Badge variant="secondary">{payment[2]}</Badge>
              </Item>
            )}
          </For>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

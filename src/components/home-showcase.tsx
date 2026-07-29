import {
  ArrowRight,
  Blocks,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  MessageSquare,
  Palette,
  Terminal,
} from "lucide-solid";
import { createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { Github } from "@/components/icons/github";
import { cn } from "@/lib/utils";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";

const INSTALL_COMMAND = "bunx shadcn@latest add https://zaidan.dev/r/kobalte/button.json";

type PanelProps = {
  title: string;
  content: string;
  eyebrow?: string;
  class?: string;
  children: JSX.Element;
};

function Panel(props: PanelProps) {
  const [local] = splitProps(props, ["title", "content", "eyebrow", "class", "children"]);

  return (
    <section
      data-showcase-content={local.content}
      class={cn("rounded-2xl border bg-card p-5 shadow-sm", local.class)}
    >
      <Show when={local.eyebrow}>
        <p class="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
          {local.eyebrow}
        </p>
      </Show>
      <h2 class="mt-1 font-medium">{local.title}</h2>
      <div class="mt-5">{local.children}</div>
    </section>
  );
}

function RegistryPulse() {
  return (
    <Panel title="Registry pulse" content="Registry pulse" eyebrow="Native Solid source">
      <div class="grid gap-5 sm:grid-cols-[1fr_1.35fr]">
        <div>
          <div class="font-heading font-semibold text-5xl">62</div>
          <div class="mt-1 text-muted-foreground text-sm">authored Components</div>
          <div class="mt-5 flex flex-wrap gap-2">
            <Badge variant="secondary">Kobalte</Badge>
            <Badge variant="outline">Solid 1.x</Badge>
          </div>
        </div>
        <div
          class="flex h-32 items-end gap-2 border-b border-l px-3"
          role="img"
          aria-label="Registry activity across eight releases"
        >
          <For each={[42, 72, 54, 88, 68, 96, 80, 108]}>
            {(height, index) => (
              <span
                aria-hidden="true"
                class={cn("flex-1 rounded-t", index() === 7 ? "bg-foreground" : "bg-muted")}
                style={{ height: `${height}px` }}
              />
            )}
          </For>
        </div>
      </div>
    </Panel>
  );
}

function DesignConfiguration() {
  const configuration = [
    ["Style", "Vega"],
    ["Base color", "Neutral"],
    ["Radius", "0.5rem"],
    ["Font", "Geist"],
  ] as const;

  return (
    <Panel title="Design Configuration" content="Design Configuration" eyebrow="Make it yours">
      <dl class="space-y-3">
        <For each={configuration}>
          {([label, value]) => (
            <div class="flex items-center rounded-lg border px-3 py-2 text-sm">
              <dt class="text-muted-foreground">{label}</dt>
              <dd class="ml-auto font-medium">{value}</dd>
              <ChevronDown aria-hidden="true" class="ml-2 size-3.5 text-muted-foreground" />
            </div>
          )}
        </For>
      </dl>
      <Button as="a" href="/create" class="mt-4 w-full gap-2" size="sm">
        <Palette /> Open Create
      </Button>
    </Panel>
  );
}

function ComponentChecklist() {
  return (
    <Panel
      title="Components in this surface"
      content="Components in this surface"
      eyebrow="Inspectable composition"
    >
      <ul class="space-y-3">
        <For each={["Card", "Button", "Badge", "Calendar"]}>
          {(item) => (
            <li class="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                class="grid size-5 place-items-center rounded-full bg-foreground text-background"
              >
                <Check class="size-3" />
              </span>
              {item}
              <Code2 aria-hidden="true" class="ml-auto size-3.5 text-muted-foreground" />
            </li>
          )}
        </For>
      </ul>
      <a
        href="/components"
        class="mt-4 inline-flex items-center gap-2 rounded-sm font-medium text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse Components <ArrowRight class="size-4" />
      </a>
    </Panel>
  );
}

function ReleaseCard() {
  return (
    <Panel title="Zaidan 1.1" content="Latest release" eyebrow="Latest release">
      <p class="text-muted-foreground text-sm">New Components, Blocks, and a smoother registry.</p>
      <a
        href="/docs/changelog"
        class="mt-3 inline-flex items-center gap-2 rounded-sm font-medium text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Read changelog <ArrowRight class="size-4" />
      </a>
    </Panel>
  );
}

function ContributorCard() {
  return (
    <Panel title="Made in the open" content="Contributors" eyebrow="Contributors">
      <div class="flex flex-wrap items-center gap-4">
        <ul class="flex -space-x-2" aria-label="Zaidan contributors">
          <For each={["KA", "SL", "UI", "SO"]}>
            {(initials, index) => (
              <li
                class={cn(
                  "grid size-10 place-items-center rounded-full border-2 border-card font-medium text-xs",
                  index() % 2 ? "bg-foreground text-background" : "bg-muted",
                )}
              >
                {initials}
              </li>
            )}
          </For>
        </ul>
        <div>
          <div class="font-medium text-sm">Built together</div>
          <div class="text-muted-foreground text-xs">MIT licensed on GitHub</div>
        </div>
        <Button
          as="a"
          href="https://github.com/carere/zaidan"
          target="_blank"
          rel="noreferrer"
          variant="outline"
          size="sm"
          class="ml-auto gap-2"
        >
          <Github /> Contribute
        </Button>
      </div>
    </Panel>
  );
}

function CreateProject() {
  return (
    <Panel title="Create a project" content="Create a project" eyebrow="Own the source">
      <div class="rounded-xl border bg-muted/40 p-3 font-mono text-xs">my-solid-app</div>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <Button as="a" href="/docs/installation/vite" variant="outline" size="sm">
          Vite
        </Button>
        <Button as="a" href="/docs/installation/tanstack-start" variant="outline" size="sm">
          Start
        </Button>
      </div>
      <Button as="a" href="/create" class="mt-3 w-full" size="sm">
        Continue
      </Button>
    </Panel>
  );
}

function CommunityCard() {
  return (
    <Panel title="Build in the open" content="Community" eyebrow="Community">
      <div class="space-y-3">
        <div class="flex items-start gap-2">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-medium text-[10px]">
            KA
          </span>
          <p class="rounded-xl bg-muted px-3 py-2 text-xs">The Solid port is ready for review.</p>
        </div>
        <div class="flex flex-row-reverse items-start gap-2 text-right">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted font-medium text-[10px]">
            ZY
          </span>
          <p class="rounded-xl bg-muted px-3 py-2 text-xs">Keyboard behavior feels native now.</p>
        </div>
      </div>
      <Button
        as="a"
        href="https://github.com/carere/zaidan/discussions"
        target="_blank"
        rel="noreferrer"
        variant="outline"
        size="sm"
        class="mt-4 w-full gap-2"
      >
        <MessageSquare /> Join the community
      </Button>
    </Panel>
  );
}

function CalendarCard() {
  return (
    <Panel title="July 2026" content="Calendar" class="h-full">
      <div class="mb-3 flex items-center gap-2 text-muted-foreground text-xs">
        <CalendarDays class="size-4" /> Release calendar
      </div>
      <div
        class="grid grid-cols-7 gap-1 text-center text-[10px]"
        role="img"
        aria-label="July 2026 calendar with release day July 28 highlighted"
      >
        <For each={["M", "T", "W", "T", "F", "S", "S"]}>
          {(day) => <span class="text-muted-foreground">{day}</span>}
        </For>
        <For each={Array.from({ length: 21 }, (_, index) => index + 8)}>
          {(day) => (
            <span
              class={cn(
                "grid aspect-square place-items-center rounded-md",
                day === 28 && "bg-foreground text-background",
              )}
            >
              {day}
            </span>
          )}
        </For>
      </div>
    </Panel>
  );
}

function CatalogCoverage() {
  return (
    <Panel title="Catalog coverage" content="Catalog coverage" eyebrow="This month" class="h-full">
      <div class="flex items-center gap-5">
        <div
          class="grid size-28 shrink-0 place-items-center rounded-full border-[14px] border-muted border-t-foreground"
          role="img"
          aria-label="Eighty-seven percent catalog coverage"
        >
          <span class="font-heading font-semibold text-2xl">87%</span>
        </div>
        <dl class="space-y-3 text-sm">
          <Metric icon={Blocks} value="62" label="Components" />
          <Metric icon={ChartNoAxesCombined} value="70" label="Charts" />
          <Metric icon={FileText} value="2" label="Blocks" />
        </dl>
      </div>
    </Panel>
  );
}

function Metric(props: { icon: typeof Blocks; value: string; label: string }) {
  const [local] = splitProps(props, ["icon", "value", "label"]);
  return (
    <div class="flex items-center gap-2">
      <local.icon aria-hidden="true" class="size-4 text-muted-foreground" />
      <dt class="sr-only">{local.label}</dt>
      <dd>
        <span class="font-medium">{local.value}</span>{" "}
        <span class="text-muted-foreground">{local.label}</span>
      </dd>
    </div>
  );
}

function InstallCard() {
  const [status, setStatus] = createSignal("");

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setStatus("Install command copied");
    } catch {
      setStatus("Unable to copy install command");
    }
  };

  return (
    <Panel
      title="Install from the registry"
      content="Install from the registry"
      eyebrow="Copy-ready source"
    >
      <div class="flex items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-background">
        <Terminal aria-hidden="true" class="size-4 shrink-0" />
        <code data-install-command class="min-w-0 flex-1 overflow-hidden text-ellipsis text-xs">
          {INSTALL_COMMAND}
        </code>
        <button
          type="button"
          aria-label="Copy install command"
          class="grid size-8 shrink-0 place-items-center rounded-md outline-none hover:bg-background/15 focus-visible:ring-2 focus-visible:ring-background"
          onClick={copyCommand}
        >
          <Copy aria-hidden="true" class="size-4" />
        </button>
      </div>
      <p role="status" aria-live="polite" class="sr-only">
        {status()}
      </p>
    </Panel>
  );
}

function MobileArtwork() {
  return (
    <section
      data-home-mobile
      class="overflow-hidden md:hidden"
      aria-labelledby="mobile-showcase-caption"
    >
      <figure class="relative left-1/2 w-[min(140vw,42rem)] -translate-x-1/2 overflow-hidden py-3">
        <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-linear-to-b from-background to-transparent" />
        <img
          data-mobile-artwork
          src="/home-showcase-light.svg"
          alt=""
          width="672"
          height="704"
          aria-hidden="true"
          class="block h-auto w-full dark:hidden"
        />
        <img
          data-mobile-artwork
          src="/home-showcase-dark.svg"
          alt=""
          width="672"
          height="704"
          aria-hidden="true"
          class="hidden h-auto w-full dark:block"
        />
        <figcaption id="mobile-showcase-caption" class="sr-only">
          Static artwork showing the Zaidan registry, Design Configuration, calendar, catalog, and
          install workbench.
        </figcaption>
      </figure>
    </section>
  );
}

function NativeShowcase() {
  return (
    <section
      data-home-showcase="native"
      aria-label="Zaidan system workbench"
      class="relative hidden overflow-hidden rounded-2xl bg-muted p-4 md:block md:p-6 dark:bg-background"
    >
      <div class="relative z-10 mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-4">
        <div data-showcase-column class="flex flex-col gap-4">
          <RegistryPulse />
          <DesignConfiguration />
        </div>
        <div data-showcase-column class="hidden flex-col gap-4 lg:flex">
          <ComponentChecklist />
          <ReleaseCard />
          <ContributorCard />
        </div>
        <div data-showcase-column class="hidden flex-col gap-4 min-[1400px]:flex">
          <CreateProject />
          <CommunityCard />
        </div>
        <div data-showcase-column class="hidden flex-col gap-4 md:flex">
          <CalendarCard />
          <CatalogCoverage />
          <InstallCard />
        </div>
      </div>
      <div
        data-showcase-fade="top"
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 z-20 h-56 bg-linear-to-b from-background via-muted/70 to-transparent dark:via-background/70"
      />
      <div
        data-showcase-fade="bottom"
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-linear-to-t from-background via-muted/70 to-transparent dark:via-background/70"
      />
    </section>
  );
}

export function HomeShowcase() {
  return (
    <div class="mx-auto w-full max-w-[1520px] overflow-hidden px-4 pb-24 md:px-6">
      <MobileArtwork />
      <NativeShowcase />
    </div>
  );
}

import { makePersisted, messageSync } from "@solid-primitives/storage";
import { CircleAlert, TriangleAlert } from "lucide-solid";
import {
  type ComponentProps,
  children,
  createSignal,
  For,
  type ParentProps,
  Show,
  type Signal,
  splitProps,
} from "solid-js";
import { isServer } from "solid-js/web";
import { CliButton } from "@/components/cli-button";
import { CodeTabs, ComponentPreview, ComponentSource } from "@/components/component-preview";
import { ComponentsList } from "@/components/components-list";
import { SolidStartLogo } from "@/components/icons/solid-start";
import { SolidJS } from "@/components/icons/solidjs";
import { SolidJsOff } from "@/components/icons/solidjs-off";
import { Zaidan } from "@/components/icons/zaidan";
import { PackageManagerCodeBlock } from "@/components/package-manager-code-block";
import { cn, getStorage } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Button } from "@/registry/kobalte/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { Carere } from "./icons/carere";

export const ChangelogEntry = (props: ParentProps) => (
  <article data-slot="changelog-entry" class="mb-12 border-border border-b pb-12 last:border-b-0">
    {props.children}
  </article>
);

export const MoreUpdates = (props: ParentProps) => (
  <section id="more-updates" data-slot="more-updates" class="mb-24 scroll-mt-24">
    <h2 class="mb-6 font-heading font-semibold text-xl tracking-tight">More Updates</h2>
    <div class="grid auto-rows-fr gap-3 sm:grid-cols-2">{props.children}</div>
  </section>
);

export const UpdateCard = (props: { date: string; title: string; href?: string }) => {
  const baseClass =
    "flex w-full flex-col gap-1 rounded-xl bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-card/80";

  return (
    <Show
      when={props.href}
      fallback={
        <div data-slot="update-card" class={baseClass}>
          <span class="text-muted-foreground text-xs">{props.date}</span>
          <span class="font-medium text-sm">{props.title}</span>
        </div>
      }
    >
      <a data-slot="update-card" class={cn(baseClass, "no-underline")} href={props.href}>
        <span class="text-muted-foreground text-xs">{props.date}</span>
        <span class="font-medium text-sm">{props.title}</span>
      </a>
    </Show>
  );
};

function MdxTable(props: ComponentProps<"table">) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div class="typeset-scroll scroll-fade-x no-scrollbar">
      <table class={local.class} {...others} />
    </div>
  );
}

function MdxPre(props: ComponentProps<"pre">) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <pre
      data-not-typeset
      class={cn(
        "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto px-4 py-3.5 outline-none has-data-highlighted-line:px-0 has-data-line-numbers:px-0 has-data-[slot=tabs]:p-0",
        local.class,
      )}
      {...others}
    />
  );
}

function MdxSteps(props: ComponentProps<"div">) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <div
      class={cn(
        "steps mb-12 [counter-reset:step] md:ml-4 md:border-l md:pl-8 [&>h3]:step",
        local.class,
      )}
      {...others}
    />
  );
}

function MdxTabs(props: ComponentProps<typeof Tabs>) {
  const [local, others] = splitProps(props, ["class"]);
  return <Tabs class={cn("relative mt-6 w-full", local.class)} {...others} />;
}

function MdxTabsList(props: ComponentProps<typeof TabsList>) {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return (
    <TabsList
      variant={local.variant ?? "line"}
      class={cn("justify-start gap-4 rounded-none bg-transparent px-0", local.class)}
      {...others}
    />
  );
}

function MdxTabsTrigger(props: ComponentProps<typeof TabsTrigger>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <TabsTrigger
      class={cn(
        "h-auto! rounded-none border-0 border-transparent bg-transparent px-0 pt-0! pb-[9px]! text-base leading-5 text-muted-foreground shadow-none hover:text-primary data-selected:bg-transparent data-selected:text-foreground data-selected:shadow-none dark:data-selected:border-primary dark:data-selected:bg-transparent dark:data-selected:text-foreground",
        local.class,
      )}
      {...others}
    />
  );
}

function MdxTabsContent(props: ComponentProps<typeof TabsContent>) {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <TabsContent
      class={cn(
        "relative [&>.steps]:mt-6 [&_h3.font-heading]:font-medium [&_h3.font-heading]:text-base *:[figure]:first:mt-0",
        local.class,
      )}
      {...others}
    />
  );
}

export const sharedComponents = {
  ComponentsList,
  table: MdxTable,
  pre: MdxPre,
  code: (props: ComponentProps<"code">) => <code {...props} />,
  Step: (props: ComponentProps<"h3">) => <h3 {...props} />,
  Steps: MdxSteps,

  DirectiveContainer: (
    props: {
      type:
        | "info"
        | "note"
        | "tip"
        | "important"
        | "warning"
        | "danger"
        | "caution"
        | "details"
        | "tab-group"
        | "tab";
      title?: string;
      codeGroup?: string;
      tabNames?: string;
      withTsJsToggle?: string;
    } & ParentProps,
  ) => {
    const _children = children(() => props.children).toArray();

    if (props.type === "tab") {
      return _children;
    }

    if (props.type === "tab-group") {
      const tabNames = props.tabNames?.split("\0") as string[];

      const [openTab, setOpenTab] = makePersisted<string, Signal<string>>(
        createSignal(tabNames[0] ?? ""),
        {
          name: `tab-group:${props.title}`,
          sync: isServer ? undefined : messageSync(new BroadcastChannel("tab-group")),
          storage: getStorage(),
        },
      );

      return (
        <Tabs class="relative mt-6 w-full" onChange={setOpenTab} value={openTab?.()}>
          <TabsList class="justify-start gap-4 rounded-none bg-transparent px-0">
            <For each={tabNames}>
              {(title) => (
                <TabsTrigger
                  class="rounded-none border-0 bg-transparent px-0 pb-3 text-base text-muted-foreground hover:text-primary data-selected:bg-transparent data-selected:text-foreground data-selected:shadow-none dark:data-selected:bg-transparent dark:data-selected:text-foreground"
                  value={title}
                >
                  {title}
                </TabsTrigger>
              )}
            </For>
          </TabsList>

          <For each={tabNames}>
            {(title, i) => (
              <TabsContent
                class="relative hidden data-selected:block [&>.steps]:mt-6 [&_h3.font-heading]:font-medium [&_h3.font-heading]:text-base [&_pre]:min-h-112.5! *:[figure]:first:mt-0"
                forceMount={true}
                value={title}
              >
                {_children[i()]}
              </TabsContent>
            )}
          </For>
        </Tabs>
      );
    }

    if (props.type === "details") {
      return (
        <details data-custom-container="details">
          <summary>{props.title ?? props.type}</summary>
          {_children}
        </details>
      );
    }

    const Icon = ["warning", "danger", "caution"].includes(props.type)
      ? TriangleAlert
      : CircleAlert;

    return (
      <Alert
        data-not-typeset
        data-variant={props.type}
        class="mt-6 w-auto rounded-2xl border-surface bg-surface text-surface-foreground shadow-none md:-mx-1 **:[code]:border"
      >
        <Icon class="size-4" />
        <Show when={props.title !== " "}>
          <AlertTitle class="capitalize">{props.title ?? props.type}</AlertTitle>
        </Show>
        <AlertDescription class="text-card-foreground/80">{_children}</AlertDescription>
      </Alert>
    );
  },
  Button,
  Carere,
  SolidJS,
  SolidJsOff,
  SolidStartLogo,
  Zaidan,
  Alert,
  AlertTitle,
  AlertDescription,
  CircleAlert,
  TriangleAlert,
  CliButton,
  CodeTabs,
  ComponentPreview,
  ComponentSource,
  PackageManagerCodeBlock,
  Tabs: MdxTabs,
  TabsContent: MdxTabsContent,
  TabsList: MdxTabsList,
  TabsTrigger: MdxTabsTrigger,
  ChangelogEntry,
  MoreUpdates,
  UpdateCard,
  PlannedBadge: () => (
    <span class="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-600 text-xs dark:text-amber-400">
      Planned
    </span>
  ),
  InProgressBadge: () => (
    <span class="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-medium text-sky-600 text-xs dark:text-sky-400">
      In Progress
    </span>
  ),
  UpcomingBadge: () => (
    <span class="inline-flex items-center rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-0.5 font-medium text-xs text-zinc-600 dark:text-zinc-400">
      Upcoming
    </span>
  ),
};

import { makePersisted, messageSync } from "@solid-primitives/storage";
import { CircleAlert, Terminal, TriangleAlert } from "lucide-solid";
import { type ComponentProps, children, createSignal, For, type ParentProps, Show } from "solid-js";
import { isServer } from "solid-js/web";
import { CliButton } from "@/components/cli-button";
import { SolidStartLogo } from "@/components/icons/solid-start";
import { SolidJS } from "@/components/icons/solidjs";
import { SolidJsOff } from "@/components/icons/solidjs-off";
import { Zaidan } from "@/components/icons/zaidan";
import { getStorage } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Button } from "@/registry/kobalte/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/kobalte/ui/tabs";
import { Carere } from "./icons/carere";

export const sharedComponents = {
  h1: (props: ComponentProps<"h1">) => {
    return (
      <h1
        class="relative mt-2 scroll-m-28 font-bold font-heading text-3xl tracking-tight [&>a]:no-underline"
        {...props}
      />
    );
  },
  h2: (props: ComponentProps<"h2">) => {
    return (
      <h2
        class="relative mt-10 scroll-m-28 font-heading font-medium text-xl tracking-tight first:mt-0 lg:mt-12 [&+.steps>h3]:mt-4! [&+.steps]:mt-0! [&+h3]:mt-6! [&+p]:mt-4! [&+]*:[code]:text-xl"
        {...props}
      />
    );
  },
  h3: (props: ComponentProps<"h3">) => {
    return (
      <h3
        class="relative mt-12 scroll-m-28 font-heading font-medium text-lg tracking-tight [&+p]:mt-4! *:[code]:text-xl"
        {...props}
      />
    );
  },

  h4: (props: ComponentProps<"h4">) => {
    return (
      <h4
        class="relative mt-8 scroll-m-28 font-heading font-medium text-base tracking-tight"
        {...props}
      />
    );
  },

  h5: (props: ComponentProps<"h5">) => {
    return <h5 class="relative mt-8 scroll-m-28 font-medium text-base tracking-tight" {...props} />;
  },

  h6: (props: ComponentProps<"h6">) => {
    return <h6 class="relative mt-8 scroll-m-28 font-medium text-base tracking-tight" {...props} />;
  },

  a: (props: ComponentProps<"a">) => {
    return <a class="font-medium underline-offset-4" {...props} />;
  },

  p: (props: ComponentProps<"p">) => {
    return <p class="not-first:mt-6 text-sm leading-relaxed" {...props} />;
  },

  strong: (props: ComponentProps<"strong">) => {
    return <strong class="font-medium" {...props} />;
  },

  ul: (props: ComponentProps<"ul">) => {
    return <ul class="my-6 ml-6 list-disc" {...props} />;
  },

  ol: (props: ComponentProps<"ol">) => {
    return <ol class="my-6 ml-6 list-decimal" {...props} />;
  },

  li: (props: ComponentProps<"li">) => {
    return <li class="mt-2" {...props} />;
  },

  blockquote: (props: ComponentProps<"blockquote">) => {
    return <blockquote class="mt-6 border-l-2 pl-6 italic" {...props} />;
  },

  img: (props: ComponentProps<"img">) => {
    // biome-ignore lint/a11y/useAltText: <will be passed as props>
    return <img class="rounded-md" {...props} />;
  },

  hr: (props: ComponentProps<"hr">) => {
    return <hr class="my-4 md:my-8" {...props} />;
  },

  table: (props: ComponentProps<"table">) => {
    return (
      <div class="no-scrollbar my-6 w-full overflow-y-auto rounded-xl border">
        <table
          class="relative w-full overflow-hidden border-none text-sm [&_tbody_tr:last-child]:border-b-0"
          {...props}
        />
      </div>
    );
  },

  tr: (props: ComponentProps<"tr">) => {
    return <tr class="m-0 border-b" {...props} />;
  },

  th: (props: ComponentProps<"th">) => {
    return (
      <th
        class="px-4 py-2 text-left font-bold [[align=center]]:text-center [[align=right]]:text-right"
        {...props}
      />
    );
  },

  td: (props: ComponentProps<"td">) => {
    return (
      <td
        class="whitespace-nowrap px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right"
        {...props}
      />
    );
  },

  pre: (props: ComponentProps<"pre">) => {
    return (
      <pre
        class="no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-y-auto overscroll-x-contain px-4 py-3.5 outline-none has-data-[slot=tabs]:p-0 has-data-highlighted-line:px-0 has-data-line-numbers:px-0"
        {...props}
      />
    );
  },

  code: (props: ComponentProps<"code">) => {
    return (
      <code
        class="wrap-break-word relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.8rem] outline-none"
        {...props}
      />
    );
  },

  Step: (props: ComponentProps<"h3">) => (
    <h3 class="mt-8 scroll-m-32 font-heading font-medium text-lg tracking-tight" {...props} />
  ),

  Steps: (props: ComponentProps<"div">) => (
    <div
      class="[&>h3]:step steps mb-12 [counter-reset:step] md:ml-4 md:border-l md:pl-8"
      {...props}
    />
  ),

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

      const [openTab, setOpenTab] = makePersisted(createSignal(tabNames[0]), {
        name: `tab-group:${props.title}`,
        sync: isServer ? undefined : messageSync(new BroadcastChannel("tab-group")),
        storage: getStorage(),
      });

      if (props.title === "package-manager") {
        const tabNames = props.tabNames?.split("\0");
        return (
          <div class="mt-6 rounded-lg bg-accent first:mt-0 dark:bg-zinc-900">
            <Tabs class="gap-0" onChange={setOpenTab} value={openTab?.()}>
              <div class="flex items-center gap-2 border-border/50 border-b px-3 py-1">
                <div class="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
                  <Terminal class="size-3 text-white dark:text-black" />
                </div>
                <TabsList class="rounded-none bg-transparent p-0">
                  <For each={tabNames}>
                    {(title) => (
                      <TabsTrigger
                        class="h-7 border border-transparent pt-0.5 data-selected:border-input data-selected:bg-accent data-selected:shadow-none"
                        value={title}
                      >
                        {title}
                      </TabsTrigger>
                    )}
                  </For>
                </TabsList>
              </div>
              <div class="no-scrollbar overflow-x-auto">
                <For each={tabNames}>
                  {(title, i) => (
                    <TabsContent
                      class="relative mt-0 hidden data-selected:block"
                      forceMount={true}
                      value={title}
                    >
                      {_children[i()]}
                    </TabsContent>
                  )}
                </For>
              </div>
            </Tabs>
          </div>
        );
      }

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
        <details class="custom-container" data-custom-container="details">
          <summary>{props.title ?? props.type}</summary>
          {_children}
        </details>
      );
    }

    return (
      <div class="custom-container" data-custom-container={props.type}>
        <Show when={props.title !== " "}>
          <span>{props.title ?? props.type}</span>
        </Show>
        {_children}
      </div>
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

import { Menu } from "lucide-solid";
import type { ParentProps } from "solid-js";
import { createMemo, Show, splitProps } from "solid-js";
import { TableOfContents } from "@/components/toc";
import type { TocEntry } from "@/lib/types";
import { cn, flattenTocUrls } from "@/lib/utils";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/kobalte/ui/collapsible";

type DocsPageProps = ParentProps<{
  toc: TocEntry;
  class?: string;
}>;

function getVisibleToc(toc: TocEntry): TocEntry {
  if (toc.length === 1 && toc[0]?.items.length) {
    return toc[0].items;
  }

  return toc;
}

export function DocsPage(props: DocsPageProps) {
  const [local, others] = splitProps(props, ["toc", "class", "children"]);
  const toc = createMemo(() => getVisibleToc(local.toc));
  const hasToc = createMemo(() => flattenTocUrls(toc()).length > 1);

  return (
    <div
      data-slot="docs"
      class={cn(
        "flex min-w-0 scroll-mt-24 items-stretch pb-8 text-[1.05rem] sm:text-[15px] xl:w-full",
        local.class,
      )}
      {...others}
    >
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="h-(--top-spacing) shrink-0" />
        <article class="relative mx-auto flex w-full max-w-160 min-w-0 flex-1 flex-col px-4 py-6 text-foreground md:px-0 lg:py-8">
          <Show when={hasToc()}>
            <Collapsible class="absolute top-6 right-4 z-20 xl:hidden">
              <CollapsibleTrigger
                as={Button}
                variant="secondary"
                size="icon-sm"
                data-slot="mobile-toc-trigger"
              >
                <Menu class="size-4" />
                <span class="sr-only">Toggle table of contents</span>
              </CollapsibleTrigger>
              <CollapsibleContent
                class="absolute top-full right-0 mt-2 max-h-[70svh] w-64 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg"
                data-slot="mobile-toc-content"
              >
                <TableOfContents toc={toc()} />
              </CollapsibleContent>
            </Collapsible>
          </Show>
          <div class="typeset w-full flex-1 pb-16 *:data-[slot=alert]:first:mt-0 sm:pb-0">
            {local.children}
          </div>
        </article>
      </div>
      <aside class="sticky top-[calc(var(--header-height)+1px)] z-30 ml-auto hidden h-[90svh] w-(--toc-width) shrink-0 flex-col overflow-hidden overscroll-none pb-8 xl:flex">
        <div class="h-(--top-spacing) shrink-0" />
        <Show when={hasToc()}>
          <div class="scroll-fade no-scrollbar overflow-y-auto px-8">
            <TableOfContents toc={toc()} />
          </div>
        </Show>
      </aside>
    </div>
  );
}

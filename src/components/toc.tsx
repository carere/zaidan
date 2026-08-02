import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { TocEntry } from "@/lib/types";
import { cn, flattenTocUrls } from "@/lib/utils";

interface TableOfContentsProps {
  toc: TocEntry;
  class?: string;
}

/**
 * Recursive component to render TOC items with proper nesting
 */
function TocItems(props: { items: TocEntry; activeId: () => string | null; depth?: number }) {
  const depth = () => props.depth ?? 0;

  return (
    <For each={props.items}>
      {(item) => (
        <li>
          <a
            href={item.url}
            class={cn(
              "inline-block py-1 text-muted-foreground text-xs transition-colors hover:text-foreground",
              "data-[active=true]:font-medium data-[active=true]:text-foreground",
              {
                "pl-0": depth() === 0,
                "pl-4": depth() === 1,
                "pl-8": depth() === 2,
                "pl-12": depth() >= 3,
              },
            )}
            data-active={item.url === `#${props.activeId()}`}
          >
            {item.title}
          </a>
          <Show when={item.items.length > 0}>
            <ul>
              <TocItems items={item.items} activeId={props.activeId} depth={depth() + 1} />
            </ul>
          </Show>
        </li>
      )}
    </For>
  );
}

/**
 * Table of Contents component with scroll spy functionality
 * Displays on xl screens and larger, sticky positioned on the right side
 */
export function TableOfContents(props: TableOfContentsProps) {
  const [activeId, setActiveId] = createSignal<string | null>(null);

  onMount(() => {
    const ids = flattenTocUrls(props.toc).map((url) => url.replace(/^#/, ""));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "0% 0% -80% 0%" },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    onCleanup(() => observer.disconnect());
  });

  return (
    <nav data-slot="toc" class={props.class} aria-label="Table of contents">
      <div class="pb-4">
        <p class="mb-2 font-medium text-xs">On This Page</p>
        <ul class="space-y-1">
          <TocItems items={props.toc} activeId={activeId} />
        </ul>
      </div>
    </nav>
  );
}

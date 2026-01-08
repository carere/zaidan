import { For, Show } from "solid-js";
import type { TocEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  toc: TocEntry;
  class?: string;
}

/**
 * Flattens nested TOC entries into a list of URL fragments for scroll spy
 */
function flattenTocUrls(entries: TocEntry): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    urls.push(entry.url);
    if (entry.items.length > 0) {
      urls.push(...flattenTocUrls(entry.items));
    }
  }
  return urls;
}

/**
 * Recursive component to render TOC items with proper nesting
 */
function TocItems(props: { items: TocEntry; depth?: number }) {
  const depth = () => props.depth ?? 0;

  return (
    <For each={props.items}>
      {(item) => (
        <li>
          <a
            href={item.url}
            class={cn(
              "inline-block py-1 text-muted-foreground text-sm transition-colors hover:text-foreground",
              {
                "pl-0": depth() === 0,
                "pl-4": depth() === 1,
                "pl-8": depth() === 2,
                "pl-12": depth() >= 3,
              },
            )}
          >
            {item.title}
          </a>
          <Show when={item.items.length > 0}>
            <ul>
              <TocItems items={item.items} depth={depth() + 1} />
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
  // Skip rendering if TOC is empty or only has one top-level item with no children
  const shouldRender = () => {
    if (props.toc.length === 0) return false;
    const totalItems = flattenTocUrls(props.toc).length;
    return totalItems > 1;
  };

  return (
    <Show when={shouldRender()}>
      <nav
        class={cn(
          "sticky top-[calc(var(--header-height)+1.5rem)] hidden h-fit max-h-[calc(100vh-var(--header-height)-3rem)] w-56 shrink-0 overflow-y-auto xl:block",
          props.class,
        )}
        aria-label="Table of contents"
      >
        <div class="pb-4">
          <p class="mb-2 font-medium text-sm">On This Page</p>
          <ul class="space-y-1">
            <TocItems items={props.toc} />
          </ul>
        </div>
      </nav>
    </Show>
  );
}

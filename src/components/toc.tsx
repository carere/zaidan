import { For, Show } from "solid-js";
import type { TocNode } from "@/lib/product-routing";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  toc: readonly TocNode[];
  class?: string;
  activeUrl?: string;
  hideTitle?: boolean;
  onSelect?: (url: string) => void;
}

/**
 * Recursive component to render TOC items with proper nesting
 */
function TocItems(props: {
  items: readonly TocNode[];
  activeUrl?: string;
  depth?: number;
  onSelect?: (url: string) => void;
}) {
  const depth = () => props.depth ?? 0;

  return (
    <For each={props.items}>
      {(item) => (
        <li>
          <a
            href={item.url}
            aria-current={props.activeUrl === item.url ? "location" : undefined}
            onClick={(event) => {
              if (!props.onSelect) return;
              event.preventDefault();
              props.onSelect(item.url);
            }}
            class={cn(
              "inline-block rounded-sm py-1 text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=location]:font-medium aria-[current=location]:text-foreground motion-reduce:transition-none",
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
              <TocItems
                items={item.items}
                activeUrl={props.activeUrl}
                depth={depth() + 1}
                onSelect={props.onSelect}
              />
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
  return (
    <nav data-slot="toc" class={props.class} aria-label="Table of contents">
      <div class="pb-4">
        <Show when={!props.hideTitle}>
          <p class="mb-2 font-medium text-xs">On this page</p>
        </Show>
        <ul class="space-y-1">
          <TocItems items={props.toc} activeUrl={props.activeUrl} onSelect={props.onSelect} />
        </ul>
      </div>
    </nav>
  );
}
